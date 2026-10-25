import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@core/prisma/prisma.service';
import { PlatformLoginDto } from './dto/platform-login.dto';

export interface PlatformUserContext {
  id: string;
  email: string;
  name: string;
}

export interface PlatformSessionResponse {
  access_token: string;
  platform_user: PlatformUserContext;
}

// Mesmo truque de AuthService.signIn (Fase 1.3): gasta o mesmo tempo de
// bcrypt.compare quando o e-mail não existe, pra não dar pra descobrir por
// timing se um e-mail de platform user existe ou não. Constante local, não
// compartilhada com a de AuthService — são serviços sem relação alguma
// (ver ADR 0012/ADR 0008: duplicar 3 linhas custa menos que uma dependência
// cruzada entre dois módulos de auth independentes).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'alicerce-platform-timing-safety-dummy-value',
  10,
);

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: PlatformLoginDto): Promise<PlatformSessionResponse> {
    const platformUser = await this.prisma.platformUser.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        status: true,
      },
    });

    const passwordMatches = await bcrypt.compare(
      dto.password,
      platformUser?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!platformUser || platformUser.status !== 'ACTIVE' || !passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const context: PlatformUserContext = {
      id: platformUser.id,
      email: platformUser.email,
      name: platformUser.name,
    };

    return {
      access_token: await this.signToken(context),
      platform_user: context,
    };
  }

  async getMe(id: string): Promise<PlatformUserContext> {
    const platformUser = await this.prisma.platformUser.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, status: true },
    });

    // Reforça em cada chamada (não só no login): desativar um platform user
    // não revoga o token em si (sem infra de refresh/blacklist nesta rodada
    // — ver ADR 0012), mas corta o acesso assim que ele chamar qualquer rota
    // que passe por aqui.
    if (!platformUser || platformUser.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    const { status, ...context } = platformUser;
    void status;
    return context;
  }

  private async signToken(user: PlatformUserContext): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      username: user.email,
      scope: 'platform',
    });
  }
}
