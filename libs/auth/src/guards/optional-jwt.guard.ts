import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor() {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.headers.authorization) {
      return true;
    }
    const token: string = request?.headers?.authorization?.split(' ')?.[1];
    const jwt = new JwtService({
      secret: process.env.SECRET || 'secret',
      signOptions: { expiresIn: '6h' },
    });
    const payload = jwt.verify(token);
    request.user = payload;

    return true;
  }
}
