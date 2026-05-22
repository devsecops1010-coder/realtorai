import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import type { RequestContextData } from '../context/request-context';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService<RequestContextData>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (user) {
      this.cls.set('tenantId', user.tenantId);
      this.cls.set('userId', user.sub);
      this.cls.set('officeId', user.officeId);
      this.cls.set('role', user.role);
    }
    this.cls.set('requestId', req.id ?? req.headers?.['x-request-id']);
    return next.handle();
  }
}
