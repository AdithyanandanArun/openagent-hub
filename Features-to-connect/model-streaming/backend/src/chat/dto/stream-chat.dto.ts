// src/chat/dto/stream-chat.dto.ts

import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsIn,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MessageDto {
  @IsIn(['system', 'user', 'assistant'])
  role: 'system' | 'user' | 'assistant';

  @IsString()
  content: string;
}

export class StreamChatDto {
  @IsString()
  model: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(32_768)
  maxTokens?: number;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}
