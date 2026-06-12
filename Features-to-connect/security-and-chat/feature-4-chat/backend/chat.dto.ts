/**
 * FEATURE 4: Chat DTOs
 * ============================================================
 * Drop this file at: src/chat/dto/chat.dto.ts
 * ============================================================
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

// ── Conversation ──────────────────────────────────────────────────────────────

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  modelId?: string; // provider model identifier e.g. "gpt-4o"
}

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  modelId?: string;
}

// ── Messages ──────────────────────────────────────────────────────────────────

export class AddMessageDto {
  @IsEnum(MessageRole)
  role: MessageRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32000) // ~8k tokens
  content: string;

  @IsOptional()
  @IsUUID('4')
  parentMessageId?: string; // for branching
}

export class EditMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32000)
  content: string;
}

export class StreamMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32000)
  content: string;

  @IsOptional()
  @IsString()
  modelId?: string; // override conversation model for this turn

  @IsOptional()
  @IsUUID('4')
  parentMessageId?: string;
}
