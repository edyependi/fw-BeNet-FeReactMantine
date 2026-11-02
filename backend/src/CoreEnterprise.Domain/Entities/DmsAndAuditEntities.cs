using CoreEnterprise.Domain.Common;
using CoreEnterprise.Domain.Enums;

namespace CoreEnterprise.Domain.Entities;

public class DmsFile : BaseAuditableEntity
{
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeInBytes { get; set; }
    public string Sha256Checksum { get; set; } = string.Empty;
    public DmsModuleCategory ModuleCategory { get; set; }
    public bool IsPublic { get; set; }
}

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string EntityPrimaryKey { get; set; } = string.Empty;
    public string? OldValuesJson { get; set; }
    public string? NewValuesJson { get; set; }
    public string? AffectedColumnsJson { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class UserNotification : BaseAuditableEntity
{
    public Guid RecipientUserId { get; set; }
    public User RecipientUser { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAtUtc { get; set; }
}

