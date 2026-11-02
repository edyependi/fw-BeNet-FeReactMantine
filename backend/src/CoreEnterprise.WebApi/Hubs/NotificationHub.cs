using CoreEnterprise.Application.Common.Interfaces;
using CoreEnterprise.Application.Workflows;
using CoreEnterprise.Domain.Entities;
using Microsoft.AspNetCore.SignalR;

namespace CoreEnterprise.WebApi.Hubs;

public class NotificationHub : Hub
{
    public async Task JoinUserChannel(string userId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
    }
}

public class WorkflowNotificationPublisher : IWorkflowNotificationPublisher
{
    private readonly IApplicationDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;

    public WorkflowNotificationPublisher(IApplicationDbContext context, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    public async Task PublishToUserAsync(
        Guid recipientUserId,
        string title,
        string message,
        string? actionUrl = null,
        CancellationToken cancellationToken = default)
    {
        var notif = new UserNotification
        {
            RecipientUserId = recipientUserId,
            Title = title,
            Message = message,
            ActionUrl = actionUrl,
            IsRead = false
        };

        _context.UserNotifications.Add(notif);
        await _context.SaveChangesAsync(cancellationToken);

        await _hubContext.Clients.Group($"user:{recipientUserId}").SendAsync("ReceiveNotification", new
        {
            notif.Id,
            notif.RecipientUserId,
            notif.Title,
            notif.Message,
            notif.ActionUrl,
            notif.IsRead,
            notif.CreatedAt
        }, cancellationToken);
    }
}

