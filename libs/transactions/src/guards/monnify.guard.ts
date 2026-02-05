import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { sha512 } from 'js-sha512';
import { Observable } from 'rxjs';

@Injectable()
export class MonnifyGuard implements CanActivate {
  constructor() {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['monnify-signature'];
    const hash = sha512.hmac(
      process.env.MONNIFY_SECRET_KEY || '',
      JSON.stringify(request.body),
    );

    if (hash !== signature) {
      return false;
    }
    return true;
  }
}
