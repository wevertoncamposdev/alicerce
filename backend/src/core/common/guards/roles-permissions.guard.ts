import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { request } from 'express';

@Injectable()
export class RolesPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {

    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    const { user } = context.switchToHttp().getRequest();

    // Exemplo: user.roles = ['ADMIN'], user.permissions = ['user.read']
    if (requiredRoles && !requiredRoles.some(role => user?.roles?.includes(role))) {
      throw new ForbiddenException('Acesso negado: role insuficiente');
    }
    if (requiredPermissions && !requiredPermissions.some(permission => user?.permissions?.includes(permission))) {
      throw new ForbiddenException('Acesso negado: permission insuficiente');
    }
    return true;
  }
}
