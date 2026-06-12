import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException(
        'API key required: provide it in x-api-key header or as ?api_key= query param',
      );
    }

    const user = await this.authService.validateApiKey(apiKey);
    request.user = user;
    return true;
  }

  private extractApiKey(request: any): string | null {
    // Check x-api-key header
    const headerKey = request.headers['x-api-key'];
    if (headerKey) return headerKey;

    // Check Authorization: Bearer sk-...
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer sk-')) {
      return authHeader.split(' ')[1];
    }

    // Check query param
    return request.query?.api_key || null;
  }
}
