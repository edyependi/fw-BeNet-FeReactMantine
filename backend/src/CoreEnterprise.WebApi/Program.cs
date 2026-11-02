using System.Text;
using CoreEnterprise.Application;
using CoreEnterprise.Application.Common.Interfaces;
using CoreEnterprise.Application.Workflows;
using CoreEnterprise.Infrastructure;
using CoreEnterprise.Infrastructure.Persistence;
using CoreEnterprise.WebApi.Hubs;
using CoreEnterprise.WebApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/coreenterprise-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddSignalR();
builder.Services.AddScoped<IWorkflowNotificationPublisher, WorkflowNotificationPublisher>();

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// JWT Authentication Setup
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "CoreEnterpriseSuperSecretKey2026!@#Minimum32BytesLong";
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "CoreEnterprise.WebApi";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "CoreEnterprise.Client";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Auto-initialize and seed PostgreSQL database if available
using (var scope = app.Services.CreateScope())
{
    try
    {
        var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();
        await initialiser.InitialiseAsync();
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "PostgreSQL database initialisation skipped or deferred until container is running.");
    }
}

app.UseSerilogRequestLogging();
app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();

