import { Request, Response, NextFunction } from "express";

// ANSI Color Codes for terminal formatting
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  
  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgCyan: "\x1b[46m",
  bgMagenta: "\x1b[45m",
};

/**
 * Format method badge with distinct background or bold colors
 */
function formatMethod(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return `${colors.cyan}${colors.bold}[GET]${colors.reset}`;
    case "POST":
      return `${colors.green}${colors.bold}[POST]${colors.reset}`;
    case "PUT":
      return `${colors.yellow}${colors.bold}[PUT]${colors.reset}`;
    case "PATCH":
      return `${colors.magenta}${colors.bold}[PATCH]${colors.reset}`;
    case "DELETE":
      return `${colors.red}${colors.bold}[DELETE]${colors.reset}`;
    default:
      return `${colors.white}${colors.bold}[${method}]${colors.reset}`;
  }
}

/**
 * Format status badge with latency color
 */
function formatStatus(status: number): string {
  if (status >= 500) {
    return `🔴 ${colors.red}${colors.bold}${status} Internal Error${colors.reset}`;
  } else if (status >= 400) {
    return `🟡 ${colors.yellow}${colors.bold}${status}${colors.reset}`;
  } else if (status >= 300) {
    return `🔵 ${colors.blue}${colors.bold}${status}${colors.reset}`;
  } else {
    return `🟢 ${colors.green}${colors.bold}${status} OK${colors.reset}`;
  }
}

function formatDuration(duration: number): string {
  if (duration > 2000) {
    return `${colors.red}${colors.bold}${duration}ms ⚠️ SLOW${colors.reset}`;
  } else if (duration > 800) {
    return `${colors.yellow}${duration}ms${colors.reset}`;
  } else {
    return `${colors.green}${duration}ms${colors.reset}`;
  }
}

/**
 * Recursively sanitize data, redact secrets, and preview arrays cleanly
 */
function sanitizeData(data: any, depth = 0): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") {
    if (typeof data === "string") {
      if (data.length > 200 && (data.startsWith("data:") || data.includes(";base64,") || data.length > 500)) {
        return `[Binary/Base64 data (~${(data.length / 1024).toFixed(1)} KB)]`;
      }
      if (data.length > 300) {
        return `${data.substring(0, 300)}... (+${data.length - 300} chars)`;
      }
    }
    return data;
  }

  if (depth > 4) return "[Nested Object]";

  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    if (data.length > 3) {
      const preview = data.slice(0, 2).map((item) => sanitizeData(item, depth + 1));
      return [...preview, `... (+${data.length - 2} more items in array)`];
    }
    return data.map((item) => sanitizeData(item, depth + 1));
  }

  const sensitiveKeys = new Set([
    "password",
    "passwordhash",
    "token",
    "refreshtoken",
    "accesstoken",
    "secret",
    "authorization",
    "cookie",
    "apikey",
    "key_secret",
  ]);

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      sanitized[key] = "********";
    } else {
      sanitized[key] = sanitizeData(val, depth + 1);
    }
  }

  return sanitized;
}

/**
 * Format payload object into indented, clean JSON string for terminal
 */
function formatPayload(data: any, indent = 4): string {
  if (data === undefined || data === null) {
    return `${colors.gray}(none)${colors.reset}`;
  }
  if (typeof data === "string") {
    if (data.trim() === "") return `${colors.gray}(empty string)${colors.reset}`;
    if (data.length > 300) return `${colors.yellow}"${data.substring(0, 300)}..."${colors.reset}`;
    return `${colors.yellow}"${data}"${colors.reset}`;
  }
  if (typeof data !== "object") {
    return `${colors.yellow}${String(data)}${colors.reset}`;
  }
  if (Array.isArray(data) && data.length === 0) {
    return `${colors.gray}[]${colors.reset}`;
  }
  if (Object.keys(data).length === 0) {
    return `${colors.gray}{}${colors.reset}`;
  }

  const clean = sanitizeData(data, 0);
  const json = JSON.stringify(clean, null, 2);
  const prefix = " ".repeat(indent);
  return json.split("\n").map((line) => `${prefix}${line}`).join("\n");
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const timestamp = new Date().toLocaleTimeString();
  const url = req.originalUrl || req.url;

  // Ignore static upload assets & health endpoints to keep terminal clean
  if (url === "/health" || url.startsWith("/uploads/")) {
    return next();
  }

  // Intercept response body
  let responseBody: any = null;
  const originalJson = res.json;
  const originalSend = res.send;

  res.json = function (body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  res.send = function (body: any) {
    if (responseBody === null && body !== undefined) {
      try {
        responseBody = typeof body === "string" ? JSON.parse(body) : body;
      } catch {
        responseBody = body;
      }
    }
    return originalSend.call(this, body);
  };

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const methodBadge = formatMethod(req.method);
    const statusBadge = formatStatus(status);
    const durationBadge = formatDuration(duration);
    const userId = (req as any).user?.id || (req as any).userId;
    const userStr = userId ? `${colors.cyan}${userId}${colors.reset}` : `${colors.gray}(anonymous)${colors.reset}`;

    const hasQuery = req.query && Object.keys(req.query).length > 0;
    const hasBody = req.body && Object.keys(req.body).length > 0;

    const width = 78;
    const border = "─".repeat(width);

    console.log(`\n${colors.cyan}┌${border}┐${colors.reset}`);
    console.log(`${colors.cyan}│${colors.reset} 🚀 ${methodBadge} ${colors.bold}${colors.white}${url}${colors.reset}`);
    console.log(`${colors.cyan}│${colors.reset} 🕒 ${colors.gray}${timestamp}${colors.reset}  •  ⏱️  ${durationBadge}  •  ${statusBadge}  •  👤 ${userStr}`);
    console.log(`${colors.cyan}├${border}┤${colors.reset}`);

    // Request section
    console.log(`${colors.cyan}│${colors.reset} ${colors.bold}📥 REQUEST:${colors.reset}`);
    if (hasQuery) {
      console.log(`   ${colors.dim}• Query :${colors.reset} ${colors.yellow}${JSON.stringify(sanitizeData(req.query))}${colors.reset}`);
    }
    if (hasBody) {
      console.log(`   ${colors.dim}• Body  :${colors.reset}\n${formatPayload(req.body, 5)}`);
    } else if (!hasQuery) {
      console.log(`   ${colors.gray}• (No query parameters or body payload)${colors.reset}`);
    }

    // Response section
    console.log(`${colors.cyan}├${border}┤${colors.reset}`);
    if (status >= 400) {
      console.log(`${colors.cyan}│${colors.reset} ${colors.bold}${colors.red}📤 RESPONSE ERROR (${status}):${colors.reset}`);
    } else {
      console.log(`${colors.cyan}│${colors.reset} ${colors.bold}${colors.green}📤 RESPONSE PAYLOAD (${status}):${colors.reset}`);
    }

    console.log(`${formatPayload(responseBody, 3)}`);
    console.log(`${colors.cyan}└${border}┘${colors.reset}\n`);
  });

  next();
}
