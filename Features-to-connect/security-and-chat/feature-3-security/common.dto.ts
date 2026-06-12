/**
 * FEATURE 3: Common Validation DTOs
 * ============================================================
 * Drop this file at: src/common/dto/common.dto.ts
 *
 * AGENT INSTRUCTIONS:
 * Import and extend these DTOs in your feature-specific DTO files.
 * The global ValidationPipe (added in main.ts) will auto-validate them.
 * ============================================================
 */

import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Pagination ────────────────────────────────────────────────────────────────
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

// ── ID param ──────────────────────────────────────────────────────────────────
export class UuidParamDto {
  @IsUUID('4')
  id: string;
}

// ── Auth DTOs (used by Feature 1 — provided here for completeness) ────────────
export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  // Requires: 1 uppercase, 1 lowercase, 1 number
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain uppercase, lowercase, and a number',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
