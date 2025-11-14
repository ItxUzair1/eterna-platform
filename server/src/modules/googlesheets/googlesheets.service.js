// server/src/modules/googlesheets/googlesheets.service.js
const { ensureScope } = require("../../utils/authorize.js");
const { audit } = require("../../utils/audit.js");
const { encrypt, decrypt } = require("../../utils/encryption.js");
const prisma = require("../../config/db.js");
const axios = require("axios");

// List all connections for tenant
async function listConnections(ctx) {
  ensureScope(ctx, "crm", "read");
  const connections = await prisma.googleSheetsConnection.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      id: true,
      name: true,
      spreadsheetId: true,
      sheetName: true,
      syncDirection: true,
      lastSyncAt: true,
      createdAt: true,
      user: {
        select: { id: true, username: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return connections;
}

// Get single connection
async function getConnection(ctx, id) {
  ensureScope(ctx, "crm", "read");
  const connection = await prisma.googleSheetsConnection.findFirst({
    where: { id, tenantId: ctx.tenantId },
  });
  if (!connection) throw new Error("Connection not found");
  
  // Decrypt sensitive fields
  const decrypted = { ...connection };
  if (decrypted.apiKey) decrypted.apiKey = decrypt(decrypted.apiKey);
  if (decrypted.accessToken) decrypted.accessToken = decrypt(decrypted.accessToken);
  if (decrypted.refreshToken) decrypted.refreshToken = decrypt(decrypted.refreshToken);
  
  return decrypted;
}

// Create/Update connection
async function upsertConnection(ctx, payload) {
  ensureScope(ctx, "crm", "write");
  
  const { id, name, apiKey, accessToken, refreshToken, spreadsheetId, sheetName, syncDirection, fieldMapping } = payload;
  
  // Check if spreadsheet already connected
  if (spreadsheetId) {
    const existing = await prisma.googleSheetsConnection.findFirst({
      where: { tenantId: ctx.tenantId, spreadsheetId, id: id ? { not: id } : undefined },
    });
    if (existing) throw new Error("This spreadsheet is already connected");
  }

  const data = {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    name: name || "Google Sheets Connection",
    spreadsheetId: spreadsheetId || null,
    sheetName: sheetName || null,
    syncDirection: syncDirection || "import",
    fieldMapping: fieldMapping || null,
  };

  // Encrypt sensitive fields
  if (apiKey) data.apiKey = encrypt(apiKey);
  if (accessToken) data.accessToken = encrypt(accessToken);
  if (refreshToken) data.refreshToken = encrypt(refreshToken);

  let connection;
  if (id) {
    connection = await prisma.googleSheetsConnection.update({
      where: { id },
      data,
    });
    await audit(ctx, "googlesheets.update", "GoogleSheetsConnection", id, { name });
  } else {
    connection = await prisma.googleSheetsConnection.create({ data });
    await audit(ctx, "googlesheets.create", "GoogleSheetsConnection", connection.id, { name: connection.name });
  }

  return connection;
}

// Delete connection
async function deleteConnection(ctx, id) {
  ensureScope(ctx, "crm", "write");
  await prisma.googleSheetsConnection.delete({
    where: { id, tenantId: ctx.tenantId },
  });
  await audit(ctx, "googlesheets.delete", "GoogleSheetsConnection", id, {});
}

// Get spreadsheet info and available sheets
async function getSpreadsheetInfo(ctx, spreadsheetId, apiKey) {
  ensureScope(ctx, "crm", "read");
  
  // API key might be plain text (from frontend) or encrypted (from DB)
  let decryptedKey = apiKey;
  if (apiKey) {
    try {
      // Try to decrypt (if encrypted)
      decryptedKey = decrypt(apiKey);
    } catch {
      // If decrypt fails, assume it's plain text
      decryptedKey = apiKey;
    }
  }
  
  if (!decryptedKey) throw new Error("API key is required");
  
  try {
    // Get spreadsheet metadata
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${decryptedKey}`;
    const metadataRes = await axios.get(metadataUrl);
    
    const sheets = (metadataRes.data.sheets || []).map((sheet) => ({
      id: sheet.properties.sheetId,
      title: sheet.properties.title,
      rowCount: sheet.properties.gridProperties?.rowCount || 0,
      columnCount: sheet.properties.gridProperties?.columnCount || 0,
    }));

    return {
      title: metadataRes.data.properties?.title || "Untitled",
      sheets,
    };
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Spreadsheet not found. Please check the spreadsheet ID and ensure it's accessible.");
    }
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      let helpfulMessage = "Access denied. ";
      
      if (errorMessage?.includes("API key not valid")) {
        helpfulMessage += "Your API key is invalid. Please check that you've copied the correct API key from Google Cloud Console.";
      } else if (errorMessage?.includes("permission") || errorMessage?.includes("access")) {
        helpfulMessage += "Your API key doesn't have permission to access this spreadsheet. ";
        helpfulMessage += "Make sure: 1) The spreadsheet is shared with the email associated with your API key (if using service account), ";
        helpfulMessage += "2) The API key restrictions allow access to Google Sheets API, ";
        helpfulMessage += "3) The spreadsheet ID is correct.";
      } else {
        helpfulMessage += "Please check your API key has permission to access this spreadsheet. ";
        helpfulMessage += "Ensure the spreadsheet is shared properly and the API key restrictions allow Google Sheets API access.";
      }
      
      throw new Error(helpfulMessage);
    }
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Invalid request: ${errorMessage}. Please check the spreadsheet ID format.`);
    }
    throw new Error(`Failed to fetch spreadsheet: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Get sheet headers for mapping
async function getSheetHeaders(ctx, spreadsheetId, sheetName, apiKey) {
  ensureScope(ctx, "crm", "read");
  
  // API key might be plain text (from frontend) or encrypted (from DB)
  let decryptedKey = apiKey;
  if (apiKey) {
    try {
      // Try to decrypt (if encrypted)
      decryptedKey = decrypt(apiKey);
    } catch {
      // If decrypt fails, assume it's plain text
      decryptedKey = apiKey;
    }
  }
  
  if (!decryptedKey) throw new Error("API key is required");
  
  try {
    // Get first row as headers
    const range = `${sheetName || "Sheet1"}!A1:Z1`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${decryptedKey}`;
    const res = await axios.get(url);
    
    const headers = (res.data.values?.[0] || []).map((h, idx) => ({
      column: String.fromCharCode(65 + idx), // A, B, C...
      header: h || `Column ${idx + 1}`,
    }));

    return headers;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Spreadsheet or sheet not found. Please check the spreadsheet ID and sheet name.");
    }
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Access denied: ${errorMessage}. Please check your API key has permission to access this spreadsheet.`);
    }
    throw new Error(`Failed to fetch headers: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Sync leads: Import from Google Sheets
async function syncImport(ctx, connectionId) {
  ensureScope(ctx, "crm", "write");
  
  const connection = await prisma.googleSheetsConnection.findFirst({
    where: { id: connectionId, tenantId: ctx.tenantId },
  });
  if (!connection) throw new Error("Connection not found");

  const apiKey = connection.apiKey ? decrypt(connection.apiKey) : null;
  if (!apiKey) throw new Error("API key not configured");

  const spreadsheetId = connection.spreadsheetId;
  const sheetName = connection.sheetName || "Sheet1";
  const fieldMapping = connection.fieldMapping || {};

  try {
    // Get all data from sheet
    const range = `${sheetName}!A1:Z1000`; // Adjust range as needed
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const res = await axios.get(url);

    const rows = res.data.values || [];
    if (rows.length === 0) {
      return { imported: 0, updated: 0, errors: [] };
    }

    const headers = rows[0] || [];
    const errors = [];
    let imported = 0;
    let updated = 0;

    // Get all statuses for lookup
    const statuses = await prisma.leadStatus.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, value: true },
    });
    const statusMap = new Map(statuses.map((s) => [s.value.toLowerCase(), s.id]));

    // Process rows (skip header row)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      try {
        // Map columns to fields
        const getField = (fieldName) => {
          const mappedCol = fieldMapping[fieldName];
          if (mappedCol) {
            const colIndex = mappedCol.charCodeAt(0) - 65; // A=0, B=1, etc.
            return row[colIndex]?.trim() || null;
          }
          // Fallback: try to find by header name
          const headerIndex = headers.findIndex((h) => h.toLowerCase().includes(fieldName.toLowerCase()));
          return headerIndex >= 0 ? row[headerIndex]?.trim() || null : null;
        };

        const name = getField("name") || row[0]?.trim();
        if (!name) {
          errors.push({ row: i + 1, message: "Name is required" });
          continue;
        }

        const email = getField("email");
        if (email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push({ row: i + 1, message: "Invalid email format" });
            continue;
          }
        }

        // Lookup status
        let statusId = null;
        const statusValue = getField("status");
        if (statusValue) {
          statusId = statusMap.get(statusValue.toLowerCase()) || null;
        }

        // Check if lead exists (by email if provided, otherwise by name)
        const where = email
          ? { tenantId: ctx.tenantId, email }
          : { tenantId: ctx.tenantId, name };

        const existing = await prisma.lead.findFirst({ where });

        const leadData = {
          tenantId: ctx.tenantId,
          name,
          email: email || null,
          phone: getField("phone") || null,
          company: getField("company") || null,
          tags: getField("tags") || null,
          statusId,
        };

        if (existing) {
          await prisma.lead.update({
            where: { id: existing.id },
            data: leadData,
          });
          updated++;
        } else {
          await prisma.lead.create({ data: leadData });
          imported++;
        }
      } catch (err) {
        errors.push({ row: i + 1, message: err.message || "Unknown error" });
      }
    }

    // Update last sync time
    await prisma.googleSheetsConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() },
    });

    await audit(ctx, "googlesheets.sync.import", "GoogleSheetsConnection", connectionId, {
      imported,
      updated,
      errors: errors.length,
    });

    return { imported, updated, errors };
  } catch (error) {
    throw new Error(`Sync failed: ${error.message}`);
  }
}

// Sync leads: Export to Google Sheets
async function syncExport(ctx, connectionId) {
  ensureScope(ctx, "crm", "write");
  
  const connection = await prisma.googleSheetsConnection.findFirst({
    where: { id: connectionId, tenantId: ctx.tenantId },
  });
  if (!connection) throw new Error("Connection not found");

  const apiKey = connection.apiKey ? decrypt(connection.apiKey) : null;
  if (!apiKey) throw new Error("API key not configured");

  const spreadsheetId = connection.spreadsheetId;
  const sheetName = connection.sheetName || "Sheet1";

  try {
    // Get all leads for tenant
    const leads = await prisma.lead.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        status: { select: { value: true } },
        owner: { select: { username: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Prepare data rows
    const headers = ["Name", "Company", "Email", "Phone", "Status", "Owner", "Tags", "Created", "Updated"];
    const rows = leads.map((lead) => [
      lead.name || "",
      lead.company || "",
      lead.email || "",
      lead.phone || "",
      lead.status?.value || "",
      lead.owner?.username || lead.owner?.email || "",
      lead.tags || "",
      new Date(lead.createdAt).toLocaleString(),
      new Date(lead.updatedAt).toLocaleString(),
    ]);

    // Clear existing data and write new data
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + "!A1:Z10000")}:clear?key=${apiKey}`;
    await axios.post(clearUrl);

    // Write headers and data
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + "!A1")}?valueInputOption=RAW&key=${apiKey}`;
    await axios.put(updateUrl, {
      values: [headers, ...rows],
    });

    // Update last sync time
    await prisma.googleSheetsConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() },
    });

    await audit(ctx, "googlesheets.sync.export", "GoogleSheetsConnection", connectionId, {
      exported: leads.length,
    });

    return { exported: leads.length };
  } catch (error) {
    throw new Error(`Export sync failed: ${error.message}`);
  }
}

// Bidirectional sync
async function syncBidirectional(ctx, connectionId) {
  ensureScope(ctx, "crm", "write");
  
  const importResult = await syncImport(ctx, connectionId);
  const exportResult = await syncExport(ctx, connectionId);
  
  return {
    import: importResult,
    export: exportResult,
  };
}

module.exports = {
  listConnections,
  getConnection,
  upsertConnection,
  deleteConnection,
  getSpreadsheetInfo,
  getSheetHeaders,
  syncImport,
  syncExport,
  syncBidirectional,
};

