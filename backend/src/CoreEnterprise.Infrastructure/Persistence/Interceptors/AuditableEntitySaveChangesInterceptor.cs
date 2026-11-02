using System.Text.Json;
using CoreEnterprise.Application.Common.Interfaces;
using CoreEnterprise.Domain.Common;
using CoreEnterprise.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace CoreEnterprise.Infrastructure.Persistence.Interceptors;

public class AuditableEntitySaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentUserService _currentUserService;

    public AuditableEntitySaveChangesInterceptor(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        ApplyAuditTrail(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyAuditTrail(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyAuditTrail(DbContext? context)
    {
        if (context == null) return;

        var utcNow = DateTime.UtcNow;
        var userId = _currentUserService.UserId;
        var userName = _currentUserService.UserName ?? "SYSTEM";
        var auditLogs = new List<AuditLog>();

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.Entity is AuditLog || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                continue;

            if (entry.Entity is BaseAuditableEntity auditable)
            {
                if (entry.State == EntityState.Added)
                {
                    auditable.CreatedAt = utcNow;
                    auditable.CreatedBy = userName;
                }
                else if (entry.State == EntityState.Modified)
                {
                    auditable.UpdatedAt = utcNow;
                    auditable.UpdatedBy = userName;
                }
            }

            var oldValues = new Dictionary<string, object?>();
            var newValues = new Dictionary<string, object?>();
            var affectedColumns = new List<string>();

            foreach (var property in entry.Properties)
            {
                var propertyName = property.Metadata.Name;
                if (propertyName == "PasswordHash" || propertyName == "Token")
                    continue;

                switch (entry.State)
                {
                    case EntityState.Added:
                        newValues[propertyName] = property.CurrentValue;
                        break;
                    case EntityState.Deleted:
                        oldValues[propertyName] = property.OriginalValue;
                        break;
                    case EntityState.Modified:
                        if (property.IsModified && ! Equals(property.OriginalValue, property.CurrentValue))
                        {
                            affectedColumns.Add(propertyName);
                            oldValues[propertyName] = property.OriginalValue;
                            newValues[propertyName] = property.CurrentValue;
                        }
                        break;
                }
            }

            if (entry.State == EntityState.Modified && affectedColumns.Count == 0)
                continue;

            var pkValue = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey())?.CurrentValue?.ToString() ?? string.Empty;

            auditLogs.Add(new AuditLog
            {
                UserId = userId,
                UserName = userName,
                ActionType = entry.State switch
                {
                    EntityState.Added => "CREATE",
                    EntityState.Modified => "UPDATE",
                    EntityState.Deleted => "DELETE",
                    _ => entry.State.ToString().ToUpperInvariant()
                },
                EntityName = entry.Entity.GetType().Name,
                EntityPrimaryKey = pkValue,
                OldValuesJson = oldValues.Count > 0 ? JsonSerializer.Serialize(oldValues) : null,
                NewValuesJson = newValues.Count > 0 ? JsonSerializer.Serialize(newValues) : null,
                AffectedColumnsJson = affectedColumns.Count > 0 ? JsonSerializer.Serialize(affectedColumns) : null,
                IpAddress = _currentUserService.IpAddress,
                UserAgent = _currentUserService.UserAgent,
                CreatedAtUtc = utcNow
            });
        }

        if (auditLogs.Count > 0)
        {
            context.Set<AuditLog>().AddRange(auditLogs);
        }
    }
}

