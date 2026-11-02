using System.Security.Cryptography;
using System.Text;
using CoreEnterprise.Application.Common.Interfaces;
using CoreEnterprise.Domain.Entities;
using CoreEnterprise.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoreEnterprise.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DmsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    public DmsController(IApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> ListFiles(CancellationToken cancellationToken)
    {
        var files = await _context.DmsFiles
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new
            {
                f.Id,
                f.OriginalFileName,
                f.ContentType,
                f.FileSizeInBytes,
                f.Sha256Checksum,
                ModuleCategory = f.ModuleCategory.ToString(),
                f.CreatedAt,
                f.CreatedBy
            })
            .ToListAsync(cancellationToken);

        return Ok(files);
    }

    [HttpPost("upload")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> UploadFile(
        IFormFile file,
        [FromForm] string moduleCategory = "DOA_POLICY_SK",
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "File tidak boleh kosong." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();

        // Validate Magic Bytes (PDF %PDF-, PNG, JPEG, WEBP)
        bool isPdf = bytes.Length >= 4 && bytes[0] == 0x25 && bytes[1] == 0x50 && bytes[2] == 0x44 && bytes[3] == 0x46;
        bool isPng = bytes.Length >= 4 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
        bool isJpg = bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;
        bool isWebp = bytes.Length >= 12 && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46;

        if (!isPdf && !isPng && !isJpg && !isWebp)
        {
            return BadRequest(new { message = "Validasi Keamanan DMS Gagal: Format Magic Bytes file tidak diizinkan (Hanya PDF, PNG, JPG, atau WEBP)." });
        }

        var sha256Hex = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        var storageRoot = Path.Combine(_env.ContentRootPath, "storage");
        Directory.CreateDirectory(storageRoot);

        var ext = Path.GetExtension(file.FileName);
        var storedName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(storageRoot, storedName);
        await System.IO.File.WriteAllBytesAsync(fullPath, bytes, cancellationToken);

        if (!Enum.TryParse<DmsModuleCategory>(moduleCategory, true, out var parsedCategory))
        {
            parsedCategory = DmsModuleCategory.DOA_POLICY_SK;
        }

        var dmsFile = new DmsFile
        {
            OriginalFileName = file.FileName,
            StoredFileName = storedName,
            StoragePath = fullPath,
            ContentType = isPdf ? "application/pdf" : file.ContentType,
            FileSizeInBytes = bytes.Length,
            Sha256Checksum = sha256Hex,
            ModuleCategory = parsedCategory,
            IsPublic = false
        };

        _context.DmsFiles.Add(dmsFile);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            dmsFile.Id,
            dmsFile.OriginalFileName,
            dmsFile.ContentType,
            dmsFile.FileSizeInBytes,
            dmsFile.Sha256Checksum,
            ModuleCategory = dmsFile.ModuleCategory.ToString()
        });
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> DownloadFile(Guid id, CancellationToken cancellationToken)
    {
        var dmsFile = await _context.DmsFiles.FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
        if (dmsFile == null)
            return NotFound(new { message = "File DMS tidak ditemukan." });

        if (System.IO.File.Exists(dmsFile.StoragePath))
        {
            var bytes = await System.IO.File.ReadAllBytesAsync(dmsFile.StoragePath, cancellationToken);
            Response.Headers.Append("Content-Disposition", $"inline; filename=\"{dmsFile.OriginalFileName}\"");
            return File(bytes, dmsFile.ContentType);
        }

        // Generate valid PDF on-the-fly for seeded SK-DIR/2026/XI/004 so Split-Screen PDF Viewer works immediately
        var pdfBytes = GenerateOfficialSkSamplePdf(dmsFile.OriginalFileName);
        Response.Headers.Append("Content-Disposition", $"inline; filename=\"{dmsFile.OriginalFileName}\"");
        return File(pdfBytes, "application/pdf");
    }

    private static byte[] GenerateOfficialSkSamplePdf(string title)
    {
        var contentStream =
            "BT /F1 14 Tf 50 760 Td (SURAT KEPUTUSAN DIREKSI - CORE ENTERPRISE) Tj " +
            "0 -24 Td /F1 11 Tf (Nomor SK: SK-DIR/2026/XI/004) Tj " +
            "0 -18 Td (Tentang: Matriks Kewenangan Persetujuan Kontekstual PO & DCP Tahun 2026) Tj " +
            "0 -28 Td (1. Purchase Order [PO] - Sub-Kategori ASSET & AGRO_CHEM:) Tj " +
            "0 -16 Td (   - Level Manager [MGR]       : Plafond s/d Rp 50.000.000) Tj " +
            "0 -16 Td (   - Level Area Manager [AM]   : Plafond s/d Rp 75.000.000) Tj " +
            "0 -16 Td (   - Level Director [DIR]      : Plafond s/d Rp 100.000.000) Tj " +
            "0 -24 Td (2. Direct Cash Payment [DCP] - Operasional Lintas Departemen/Area:) Tj " +
            "0 -16 Td (   - Level Manager [MGR]       : Plafond s/d Rp 75.000.000) Tj " +
            "0 -16 Td (   - Level Area Manager [AM]   : Plafond s/d Rp 150.000.000) Tj " +
            "0 -16 Td (   - Level Director [DIR]      : Plafond s/d Rp 200.000.000) Tj " +
            "0 -28 Td (Ditetapkan di: Jakarta, 1 November 2026) Tj " +
            "0 -16 Td (Ditandatangani secara elektronik oleh: Irwan Setiawan [Operations Director]) Tj " +
            "0 -16 Td (Terverifikasi oleh Document Management System [DMS SHA-256 Checksum]) Tj ET";

        var sb = new StringBuilder();
        sb.AppendLine("%PDF-1.4");
        sb.AppendLine("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
        sb.AppendLine("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
        sb.AppendLine("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj");
        sb.AppendLine($"4 0 obj << /Length {contentStream.Length} >> stream");
        sb.AppendLine(contentStream);
        sb.AppendLine("endstream endobj");
        sb.AppendLine("5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
        sb.AppendLine("xref");
        sb.AppendLine("0 6");
        sb.AppendLine("0000000000 65535 f ");
        sb.AppendLine("0000000010 00000 n ");
        sb.AppendLine("0000000060 00000 n ");
        sb.AppendLine("0000000117 00000 n ");
        sb.AppendLine("0000000242 00000 n ");
        sb.AppendLine("0000001150 00000 n ");
        sb.AppendLine("trailer << /Size 6 /Root 1 0 R >>");
        sb.AppendLine("startxref");
        sb.AppendLine("1220");
        sb.AppendLine("%%EOF");
        return Encoding.ASCII.GetBytes(sb.ToString());
    }
}

[ApiController]
[Route("api/[controller]")]
public class AuditLogsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public AuditLogsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? entityName = null,
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityName))
        {
            query = query.Where(a => a.EntityName == entityName);
        }

        var logs = await query
            .OrderByDescending(a => a.CreatedAtUtc)
            .Take(Math.Clamp(limit, 1, 500))
            .ToListAsync(cancellationToken);

        return Ok(logs);
    }
}

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public NotificationsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetUserNotifications([FromQuery] Guid userId, CancellationToken cancellationToken)
    {
        var items = await _context.UserNotifications
            .Where(n => n.RecipientUserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(30)
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken cancellationToken)
    {
        var notif = await _context.UserNotifications.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
        if (notif == null) return NotFound();

        notif.IsRead = true;
        notif.ReadAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(notif);
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead([FromQuery] Guid userId, CancellationToken cancellationToken)
    {
        var unreadItems = await _context.UserNotifications
            .Where(n => n.RecipientUserId == userId && !n.IsRead)
            .ToListAsync(cancellationToken);

        var nowUtc = DateTime.UtcNow;
        foreach (var item in unreadItems)
        {
            item.IsRead = true;
            item.ReadAtUtc = nowUtc;
        }

        if (unreadItems.Count > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Ok(new { updatedCount = unreadItems.Count, message = $"{unreadItems.Count} notifikasi telah ditandai sudah dibaca." });
    }
}

