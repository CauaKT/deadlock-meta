This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where comments have been removed, empty lines have been removed, content has been compressed (code blocks are separated by ⋮---- delimiter).

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
````
prisma/
  migrations/
    20261113174553_init/
      migration.sql
    20261113183741_auth_tokens_and_unique_username/
      migration.sql
    migration_lock.toml
  schema.prisma
scripts/
  promote-admin.mjs
src/
  admin/
    dto/
      admin.dto.ts
    admin.controller.ts
    admin.module.ts
    admin.service.ts
  auth/
    decorators/
      current-user.decorator.ts
      roles.decorator.ts
    dto/
      auth.dto.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
    auth.controller.ts
    auth.module.ts
    auth.service.ts
    auth.types.ts
  mail/
    mail.module.ts
    mail.service.ts
  prisma/
    prisma.module.ts
    prisma.service.ts
  profiles/
    dto/
      profiles.dto.ts
    profiles.controller.ts
    profiles.module.ts
    profiles.service.ts
  tier-lists/
    dto/
      tier-lists.dto.ts
    tier-lists.controller.ts
    tier-lists.module.ts
    tier-lists.service.ts
  app.controller.spec.ts
  app.controller.ts
  app.module.ts
  app.service.ts
  main.ts
test/
  app.e2e-spec.ts
  jest-e2e.json
.dockerignore
.env.example
.gitattributes
.gitignore
.oxlintrc.json
.prettierrc
AGENTS.md
docker-compose.yml
Dockerfile
jest.config.ts
nest-cli.json
package.json
README.md
tsconfig.build.json
tsconfig.json
````

# Files

## File: prisma/migrations/20261113174553_init/migration.sql
````sql
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "handle" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "steam_id" TEXT,
    "favorite_hero_id" INTEGER,
    "banner_hero_id" INTEGER,
    "banner_image" TEXT,
    "profile_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "tier_lists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "title" TEXT NOT NULL,
    "author_name" TEXT,
    "tiers" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tier_lists_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");
CREATE UNIQUE INDEX "profiles_handle_key" ON "profiles"("handle");
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tier_lists" ADD CONSTRAINT "tier_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
````

## File: prisma/migrations/20261113183741_auth_tokens_and_unique_username/migration.sql
````sql
/*
  Warnings:
  - A unique constraint covering the columns `[username]` on the table `profiles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[google_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
*/
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');
ALTER TABLE "profiles" ALTER COLUMN "username" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN     "google_id" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");
CREATE INDEX "auth_tokens_user_id_type_idx" ON "auth_tokens"("user_id", "type");
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
````

## File: prisma/migrations/migration_lock.toml
````toml
# Please do not edit this file manually
# It should be added in your version-control system (e.g., Git)
provider = "postgresql"
````

## File: prisma/schema.prisma
````prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  USER
  ADMIN
}

enum TokenType {
  EMAIL_VERIFY
  PASSWORD_RESET
}

model User {
  id            String      @id @default(uuid())
  email         String      @unique
  passwordHash  String?     @map("password_hash")
  googleId      String?     @unique @map("google_id")
  role          Role        @default(USER)
  emailVerified Boolean     @default(false) @map("email_verified")
  profile       Profile?
  tierLists     TierList[]
  authTokens    AuthToken[]
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@map("users")
}

model AuthToken {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      TokenType
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  createdAt DateTime  @default(now()) @map("created_at")

  @@index([userId, type])
  @@map("auth_tokens")
}

model Profile {
  id             String   @id @default(uuid())
  userId         String   @unique @map("user_id")
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  username       String?  @unique
  handle         String?  @unique
  bio            String?
  avatarUrl      String?  @map("avatar_url")
  steamId        String?  @map("steam_id")
  favoriteHeroId Int?     @map("favorite_hero_id")
  bannerHeroId   Int?     @map("banner_hero_id")
  bannerImage    String?  @map("banner_image")
  profileColor   String?  @map("profile_color")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("profiles")
}

model TierList {
  id         String   @id @default(uuid())
  userId     String?  @map("user_id")
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  title      String
  authorName String?  @map("author_name")
  tiers      Json
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("tier_lists")
}
````

## File: scripts/promote-admin.mjs
````javascript

````

## File: src/admin/dto/admin.dto.ts
````typescript
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';
⋮----
export class UpdateUserRoleDto
````

## File: src/admin/admin.controller.ts
````typescript
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto } from './dto/admin.dto';
⋮----
export class AdminController
⋮----
constructor(private readonly adminService: AdminService)
⋮----
async overview()
⋮----
async listUsers(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  )
⋮----
async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  )
````

## File: src/admin/admin.module.ts
````typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
⋮----
export class AdminModule
````

## File: src/admin/admin.service.ts
````typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
⋮----
export class AdminService
⋮----
constructor(private readonly prisma: PrismaService)
⋮----
async listUsers(search?: string, page = 1, limit = 20)
⋮----
async updateUserRole(targetUserId: string, role: Role)
⋮----
async getSystemOverview()
````

## File: src/auth/decorators/current-user.decorator.ts
````typescript
import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth.types';
````

## File: src/auth/decorators/roles.decorator.ts
````typescript
import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';
⋮----
export const Roles = (...roles: Role[]) =>
````

## File: src/auth/dto/auth.dto.ts
````typescript
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
⋮----
const trimValue = ({ value }: { value: unknown }): unknown =>
⋮----
const normalizeEmail = ({ value }: { value: unknown }): unknown =>
⋮----
export class RegisterDto
⋮----
export class LoginDto
⋮----
export class VerifyEmailDto
⋮----
export class EmailOnlyDto
⋮----
export class ResetPasswordDto
````

## File: src/auth/guards/jwt-auth.guard.ts
````typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { SESSION_COOKIE_NAME } from '../auth.types';
import type { AuthenticatedUser, JwtPayload } from '../auth.types';
⋮----
function extractToken(req: Request): string | null
⋮----
export class JwtAuthGuard implements CanActivate
⋮----
constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  )
⋮----
async canActivate(context: ExecutionContext): Promise<boolean>
⋮----
export class OptionalJwtAuthGuard implements CanActivate
````

## File: src/auth/guards/roles.guard.ts
````typescript
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';
⋮----
export class RolesGuard implements CanActivate
⋮----
constructor(private readonly reflector: Reflector)
⋮----
canActivate(context: ExecutionContext): boolean
````

## File: src/auth/auth.controller.ts
````typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import crypto from 'node:crypto';
import { AuthService } from './auth.service';
import type { SessionUserView } from './auth.service';
import {
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from './auth.types';
import type { AuthenticatedUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  EmailOnlyDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
⋮----
export class AuthController
⋮----
constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  )
⋮----
private sessionCookieOptions(): CookieOptions
````

## File: src/auth/auth.module.ts
````typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
⋮----
function parseJwtExpiresSeconds(raw?: string): number
⋮----
export class AuthModule
````

## File: src/auth/auth.service.ts
````typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, TokenType } from '@prisma/client';
import type { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './auth.types';
import type {
  EmailOnlyDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
⋮----
interface GoogleTokenResponse {
  access_token?: string;
}
⋮----
interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}
⋮----
export interface SessionUserView {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: Date;
  profile: {
    username: string | null;
    handle: string | null;
    avatarUrl: string | null;
    favoriteHeroId: number | null;
  } | null;
}
⋮----
export class AuthService
⋮----
constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  )
⋮----
private requireEmailVerification(): boolean
⋮----
private getApiUrl(): string
⋮----
getFrontendUrl(): string
⋮----
private getPublicApiUrl(): string
⋮----
private getGoogleRedirectUri(): string
⋮----
private hashToken(rawToken: string): string
⋮----
private async issueToken(userId: string, type: TokenType, ttlHours: number): Promise<string>
⋮----
private async signSessionJwt(userId: string, role: Role): Promise<string>
⋮----
async register(dto: RegisterDto): Promise<
    | { requiresEmailVerification: true; message: string }
    | { requiresEmailVerification: false; accessToken: string; user: SessionUserView }
  >
⋮----
async login(dto: LoginDto): Promise<{ accessToken: string; user: SessionUserView }>
⋮----
async getSessionUser(userId: string): Promise<SessionUserView>
⋮----
async verifyEmailToken(rawToken: string): Promise<void>
⋮----
async resendVerification(dto: EmailOnlyDto): Promise<{ ok: true; message: string }>
⋮----
async forgotPassword(dto: EmailOnlyDto): Promise<{ ok: true; message: string }>
⋮----
async resetPassword(dto: ResetPasswordDto): Promise<{ ok: true; message: string }>
⋮----
buildGoogleAuthorizeUrl(state: string): string | null
⋮----
async handleGoogleCallback(code: string): Promise<{
    accessToken: string;
    needsOnboarding: boolean;
  }>
````

## File: src/auth/auth.types.ts
````typescript
import type { Role } from '@prisma/client';
⋮----
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
}
⋮----
export interface JwtPayload {
  sub: string;
  role: Role;
}
````

## File: src/mail/mail.module.ts
````typescript
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
⋮----
export class MailModule
````

## File: src/mail/mail.service.ts
````typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
⋮----
export class MailService
⋮----
constructor(private readonly config: ConfigService)
⋮----
private parseSender(): { name?: string; email: string }
⋮----
async sendVerificationEmail(to: string, verifyUrl: string): Promise<void>
⋮----
async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>
⋮----
private async sendViaBrevoHttp(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void>
⋮----
private async send(
    to: string,
    subject: string,
    text: string,
    html: string,
    devUrl: string,
  ): Promise<void>
````

## File: src/prisma/prisma.module.ts
````typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
⋮----
export class PrismaModule
````

## File: src/prisma/prisma.service.ts
````typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
⋮----
export class PrismaService
extends PrismaClient
⋮----
async onModuleInit(): Promise<void>
⋮----
async onModuleDestroy(): Promise<void>
````

## File: src/profiles/dto/profiles.dto.ts
````typescript
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
⋮----
const trimString = ({ value }: { value: unknown }): unknown =>
⋮----
const emptyToNull = ({ value }: { value: unknown }): unknown =>
⋮----
const normalizeHandle = ({ value }: { value: unknown }): unknown =>
⋮----
export class OnboardingDto
⋮----
export class UpdateProfileLookDto
⋮----
export class UpdateProfileSettingsDto
````

## File: src/profiles/profiles.controller.ts
````typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  OnboardingDto,
  UpdateProfileLookDto,
  UpdateProfileSettingsDto,
} from './dto/profiles.dto';
import { ProfilesService } from './profiles.service';
⋮----
export class ProfilesController
⋮----
constructor(private readonly profilesService: ProfilesService)
⋮----
async getMe(@CurrentUser() user: AuthenticatedUser)
⋮----
async onboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OnboardingDto,
  )
⋮----
async updateLook(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileLookDto,
  )
⋮----
async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileSettingsDto,
  )
⋮----
async community(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('limit') limit?: string,
  )
⋮----
async byHandle(@Param('handle') handle: string)
````

## File: src/profiles/profiles.module.ts
````typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
⋮----
export class ProfilesModule
````

## File: src/profiles/profiles.service.ts
````typescript
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  OnboardingDto,
  UpdateProfileLookDto,
  UpdateProfileSettingsDto,
} from './dto/profiles.dto';
⋮----
export interface PublicProfileView {
  id: string;
  username: string | null;
  handle: string | null;
  avatarUrl: string | null;
  favoriteHeroId: number | null;
  bio: string | null;
  bannerHeroId: number | null;
  bannerImage: string | null;
  profileColor: string | null;
  createdAt: Date;
}
⋮----
export interface CommunityProfileView {
  id: string;
  username: string | null;
  handle: string | null;
  avatarUrl: string | null;
  favoriteHeroId: number | null;
}
⋮----
export class ProfilesService
⋮----
constructor(private readonly prisma: PrismaService)
⋮----
private async ensureUniqueFields(
    userId: string,
    username: string,
    handle?: string | null,
  ): Promise<void>
⋮----
private mapUniqueViolation(err: unknown): never
⋮----
async getOwnProfile(userId: string)
⋮----
async completeOnboarding(userId: string, dto: OnboardingDto)
⋮----
async updateLook(userId: string, dto: UpdateProfileLookDto)
⋮----
async updateSettings(userId: string, dto: UpdateProfileSettingsDto)
⋮----
async getCommunity(excludeUserId?: string, limit = 8): Promise<CommunityProfileView[]>
⋮----
async getByHandle(handle: string): Promise<PublicProfileView>
````

## File: src/tier-lists/dto/tier-lists.dto.ts
````typescript
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
⋮----
const trimString = ({ value }: { value: unknown }) =>
⋮----
export class TierRowDto
⋮----
export class CreateTierListDto
⋮----
export class UpdateTierListDto extends CreateTierListDto
````

## File: src/tier-lists/tier-lists.controller.ts
````typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTierListDto, UpdateTierListDto } from './dto/tier-lists.dto';
import { TierListsService } from './tier-lists.service';
⋮----
export class TierListsController
⋮----
constructor(private readonly tierListsService: TierListsService)
⋮----
async findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('userId') userId?: string,
    @Query('handle') handle?: string,
  )
⋮----
async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  )
⋮----
async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTierListDto,
  )
⋮----
async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTierListDto,
  )
⋮----
async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  )
````

## File: src/tier-lists/tier-lists.module.ts
````typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TierListsController } from './tier-lists.controller';
import { TierListsService } from './tier-lists.service';
⋮----
export class TierListsModule
````

## File: src/tier-lists/tier-lists.service.ts
````typescript
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTierListDto, TierRowDto, UpdateTierListDto } from './dto/tier-lists.dto';
⋮----
export interface TierRowView {
  label: string;
  color: string;
  heroes: number[];
}
⋮----
export interface TierListView {
  id: string;
  title: string;
  author: string;
  authorHandle: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  tiers: TierRowView[];
  canEdit: boolean;
  canDelete: boolean;
}
⋮----
type TierListWithAuthor = Prisma.TierListGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        profile: {
          select: {
            username: true;
            handle: true;
          };
        };
      };
    };
  };
}>;
⋮----
function parseTiersJson(raw: Prisma.JsonValue): TierRowView[]
⋮----
function sanitizeTiersInput(tiers: TierRowDto[]): Prisma.InputJsonValue
⋮----
export class TierListsService
⋮----
constructor(private readonly prisma: PrismaService)
⋮----
private toView(row: TierListWithAuthor, viewer?: AuthenticatedUser): TierListView
⋮----
async findAll(
    viewer?: AuthenticatedUser,
    userId?: string,
    handle?: string,
  ): Promise<TierListView[]>
⋮----
async findOne(id: string, viewer?: AuthenticatedUser): Promise<TierListView>
⋮----
async create(user: AuthenticatedUser, dto: CreateTierListDto): Promise<TierListView>
⋮----
async update(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateTierListDto,
  ): Promise<TierListView>
⋮----
async remove(id: string, user: AuthenticatedUser): Promise<{ ok: true }>
````

## File: src/app.controller.spec.ts
````typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
````

## File: src/app.controller.ts
````typescript
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
⋮----
export class AppController
⋮----
constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  )
⋮----
getHello(): string
⋮----
async getHealth(): Promise<{ status: string; db: string }>
````

## File: src/app.module.ts
````typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilesModule } from './profiles/profiles.module';
import { TierListsModule } from './tier-lists/tier-lists.module';
⋮----
export class AppModule
````

## File: src/app.service.ts
````typescript
import { Injectable } from '@nestjs/common';
⋮----
export class AppService
⋮----
getHello(): string
````

## File: src/main.ts
````typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
⋮----
async function bootstrap()
````

## File: test/app.e2e-spec.ts
````typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
````

## File: test/jest-e2e.json
````json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
````

## File: .dockerignore
````
node_modules
dist
.env
.env.*
!.env.example
.git
.agents
.claude
.cursor
.devin
coverage
````

## File: .env.example
````
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deadlock_meta?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/deadlock_meta?schema=public"
PORT=3001
APP_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

JWT_SECRET="troque-por-um-segredo-aleatorio-longo"
JWT_EXPIRES_IN="7d"

REQUIRE_EMAIL_VERIFICATION="true"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

BREVO_API_KEY=""
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="LockPro <cauakt@gmail.com>"
````

## File: .gitattributes
````
* text=auto eol=lf
````

## File: .gitignore
````
# compiled output
/dist
/node_modules
/build

# TypeScript build cache
*.tsbuildinfo

# Logs
logs
*.log
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS
.DS_Store

# Tests
/coverage
/.nyc_output

# IDEs and editors
/.idea
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-workspace

# IDE - VSCode
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# temp directory
.temp
.tmp

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Prisma postinstall skills sync
/.agents
/.claude
/.cursor
/.devin
````

## File: .oxlintrc.json
````json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "rules": {
    "typescript/no-explicit-any": "off",
    "typescript/no-floating-promises": "error"
  },
  "env": {
    "node": true
  }
}
````

## File: .prettierrc
````
{
  "singleQuote": true,
  "trailingComma": "all"
}
````

## File: AGENTS.md
````markdown
# AGENTS.md

## NestJS

This app's version of NestJS is likely newer than what you know. https://docs.nestjs.com/llms.txt indexes its documentation, with a markdown page per chapter.

Nest has first-party packages for these, so check them before adding another library or writing your own:

- Databases: [`@nestjs/typeorm`](https://docs.nestjs.com/data/typeorm.md), [`@nestjs/drizzle`](https://docs.nestjs.com/data/drizzle.md), [`@nestjs/mongoose`](https://docs.nestjs.com/data/mongodb.md), [`@nestjs/sequelize`](https://docs.nestjs.com/data/sequelize.md).
- OpenAPI: [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction.md). GraphQL: [`@nestjs/graphql`](https://docs.nestjs.com/graphql/quick-start.md). WebSockets: [`@nestjs/websockets`](https://docs.nestjs.com/websockets/gateways.md). Microservices: [`@nestjs/microservices`](https://docs.nestjs.com/microservices/basics.md).
- Sign-in: [`@nestjs/authentication`](https://docs.nestjs.com/security/authentication.md). Permissions: [`@nestjs/authorization`](https://docs.nestjs.com/security/authorization.md). Rate limiting: [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting.md).
- Configuration: [`@nestjs/config`](https://docs.nestjs.com/application/configuration.md). Caching: [`@nestjs/cache-manager`](https://docs.nestjs.com/data/caching.md). Health checks: [`@nestjs/terminus`](https://docs.nestjs.com/reliability/terminus.md). Events inside the app: [`@nestjs/event-emitter`](https://docs.nestjs.com/application/events.md).
- Email: [`@nestjs/mail`](https://docs.nestjs.com/application/mail.md). Files, S3 included: [`@nestjs/storage`](https://docs.nestjs.com/application/file-storage.md). Translations: [`@nestjs/i18n`](https://docs.nestjs.com/application/i18n.md).
- Retries, timeouts and circuit breakers: [`@nestjs/resilience`](https://docs.nestjs.com/reliability/resilience.md).
- Idempotency keys: [`@nestjs/idempotency`](https://docs.nestjs.com/reliability/idempotency.md). Transactional outbox: [`@nestjs/outbox`](https://docs.nestjs.com/reliability/outbox.md). Sending and receiving webhooks: [`@nestjs/webhooks`](https://docs.nestjs.com/http/webhooks.md).
- Queues: [`@nestjs/bullmq`](https://docs.nestjs.com/application/queues.md). Scheduled jobs: [`@nestjs/schedule`](https://docs.nestjs.com/application/task-scheduling.md).
- Running a scheduled job on one instance, and locks: [`@nestjs/locks`](https://docs.nestjs.com/reliability/locks.md). Processes that take days: [`@nestjs/workflows`](https://docs.nestjs.com/reliability/workflows.md).
- Language models, tools and agents: [`@nestjs/ai`](https://docs.nestjs.com/ai/overview.md). MCP servers: [`@nestjs/mcp`](https://docs.nestjs.com/mcp/overview.md).

Validation works with Zod, Valibot, ArkType or any other Standard Schema library, with no classes or decorator metadata: `StandardSchemaValidationPipe` with `@Body({ schema })` or `@Param('id', { schema })` (https://docs.nestjs.com/application/validation.md). `class-validator` still works, through `ValidationPipe`.

`NodeAdapter` from `@nestjs/platform-node` is the fastest HTTP adapter, ahead of Fastify (https://docs.nestjs.com/http/performance.md).

Nest's packages are ESM only. A CommonJS project loads them through `require(esm)`, which needs Node.js 20.19+ or 22.12+, and doesn't have to convert (https://docs.nestjs.com/migration-guide.md).

## Production data: NestJS Observe

This app's production telemetry - traces, errors, logs and metrics - goes to [NestJS Observe](https://observe.nestjs.com). Until `ObserveModule` is registered in `src/app.module.ts`, nothing is sent: `npx @nestjs/observe link` sets it up in one step - it installs `@nestjs/observe`, wires it into the app, and writes the key pair (`OBSERVE_APP_KEY`, `OBSERVE_APP_SECRET`) to `.env`.

When a task depends on how the app behaves in production - an error users hit, a slow endpoint, a failing job, whether a release made things worse - work from that data, not from the code alone:

- The Observe MCP server answers those questions directly: errors with their traces and logs, slow operations, jobs, and what a release changed (`find_regressions`, `diff_release`). It is included on the Pro plan and above. In Claude Code: `claude mcp add observe --transport http https://observe-api.nestjs.com/mcp`, and the client opens a browser to approve. Other clients: https://www.observe.nestjs.com/documentation/mcp
- Without it, the user can open the request or error in the Observe dashboard and click **Copy agent prompt**, which hands over that page's trace, stack and logs as text.
````

## File: docker-compose.yml
````yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: deadlock-meta-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: deadlock_meta
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
````

## File: Dockerfile
````dockerfile
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY scripts ./scripts

EXPOSE 3001
CMD ["node", "dist/main"]
````

## File: jest.config.ts
````typescript
import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';
````

## File: nest-cli.json
````json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
````

## File: package.json
````json
{
  "name": "deadlock-meta-api",
  "version": "0.0.1",
  "description": "",
  "author": "",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "deploy": "nest deploy",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "oxlint --type-aware src/ test/",
    "test": "node --experimental-vm-modules ./node_modules/jest/bin/jest.js",
    "test:watch": "node --experimental-vm-modules ./node_modules/jest/bin/jest.js --watch",
    "test:cov": "node --experimental-vm-modules ./node_modules/jest/bin/jest.js --coverage",
    "test:debug": "node --inspect-brk --experimental-vm-modules -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config ./test/jest-e2e.json",
    "postinstall": "prisma skills sync || exit 0",
    "admin:promote": "node --env-file-if-exists=.env scripts/promote-admin.mjs"
  },
  "dependencies": {
    "@nestjs/common": "^12.0.1",
    "@nestjs/config": "^12.1.1",
    "@nestjs/core": "^12.0.1",
    "@nestjs/jwt": "^12.0.5",
    "@nestjs/platform-express": "^12.0.1",
    "@nestjs/throttler": "^6.7.1",
    "@prisma/client": "^6.19.3",
    "bcryptjs": "^3.0.3",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.15.1",
    "cookie-parser": "^1.4.7",
    "nodemailer": "^10.5.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^12.0.0",
    "@nestjs/mau": "^0.2.6",
    "@nestjs/schematics": "^12.0.0",
    "@nestjs/testing": "^12.0.1",
    "@types/cookie-parser": "^1.4.10",
    "@types/express": "^5.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.0.0",
    "@types/nodemailer": "^8.0.2",
    "@types/supertest": "^7.0.0",
    "jest": "^30.0.0",
    "oxlint": "^1.58.0",
    "oxlint-tsgolint": "^7.0.2001",
    "prettier": "^3.4.2",
    "prisma": "^6.19.3",
    "source-map-support": "^0.5.21",
    "supertest": "^7.0.0",
    "ts-jest": "^29.4.0",
    "ts-loader": "^9.5.2",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^6.0.2"
  }
}
````

## File: README.md
````markdown
# LockPro API (`deadlock-meta-api`)

API REST do projeto **LockPro**, responsável por autenticação, gerenciamento de sessões, perfis de usuários, envio de e-mails transacionais e administração.

- Repositório do front-end: `github.com/CauaKT/deadlock-meta`
- Produção: Front-end na Vercel (`https://lockpro.vercel.app`) com proxy `/api/backend/*` → API em Docker no Render (`https://deadlock-meta-api.onrender.com`) → PostgreSQL no Neon (`sa-east-1`).

---

## Stack

- **Runtime / Framework:** Node.js 22 (Docker) + NestJS 12 + Express 5 + TypeScript 6
- **Banco de Dados & ORM:** PostgreSQL 16 + Prisma 6 (`url` pooled + `directUrl` para migrations)
- **Autenticação:** JWT em cookie `httpOnly` (`lockpro_session`) + bcryptjs (hash de senha) + Google OAuth 2.0
- **E-mail:** Brevo HTTP API (`BREVO_API_KEY`, porta 443) com fallback para SMTP via Nodemailer e simulação `[DEV MAIL]` em desenvolvimento
- **Segurança & Qualidade:** `@nestjs/throttler` (rate limit), `class-validator` / `class-transformer`, `oxlint`

---

## Arquitetura de Produção (Proxy First-Party)

Em produção, o front-end Next.js (`next.config.ts`) expõe o rewrite `/api/backend/:path*` apontando para `API_URL`.
- Todas as chamadas do navegador (login, cadastro, logout, onboarding, perfis e callback do Google OAuth) trafegam pela mesma origem do front-end (`https://lockpro.vercel.app/api/backend/...`).
- Isso garante que o cookie `lockpro_session` (`httpOnly`, `sameSite: "lax"`, `secure: true` em produção/HTTPS) seja tratado como **first-party** pelos navegadores, evitando bloqueios cross-site entre `*.vercel.app` e `*.onrender.com`.
- No SSR do Next.js (`lib/backend/server.ts`), o servidor do front-end repassa o cookie `lockpro_session` manualmente no header `Cookie` para `API_URL`.

---

## Como Rodar Localmente com Docker

### 1. Pré-requisitos
- Node.js 22+
- Docker e Docker Compose

### 2. Subir o PostgreSQL com Docker
Na raiz do repositório `deadlock-meta-api`:

```bash
cp .env.example .env
docker compose up -d
```

O `docker-compose.yml` sobe o container `deadlock-meta-postgres` (`postgres:16-alpine`) na porta `5432` com banco `deadlock_meta`, usuário `postgres` e senha `postgres`.

### 3. Instalar dependências, aplicar migrations e iniciar a API

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

A API sobe em `http://localhost:3001` (verifique `http://localhost:3001/health`).

### 4. Build e execução em container Docker (produção)

```bash
docker build -t deadlock-meta-api .
docker run --rm -p 3001:3001 --env-file .env deadlock-meta-api
```

### Scripts úteis

| Script | Descrição |
| --- | --- |
| `npm run start:dev` | Inicia a API em modo watch |
| `npm run build` | Compila para `dist/` (`nest build`) |
| `npm run start:prod` | Executa `node dist/main` |
| `npm run lint` | Executa `oxlint --type-aware` em `src/` e `test/` |
| `npm run admin:promote` | Executa `scripts/promote-admin.mjs` carregando `.env` para promover um usuário a `ADMIN` |

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Connection string do PostgreSQL (em produção no Neon, usar a URL **pooled**) |
| `DIRECT_URL` | Sim | Connection string direta (sem pooler) usada pelo Prisma em migrations |
| `PORT` | Não | Porta HTTP da API (padrão `3001`; no Render é injetada automaticamente) |
| `APP_URL` | Não | URL pública da própria API (padrão `http://localhost:3001`) |
| `FRONTEND_URL` | Sim | Origem(ns) do front-end separadas por vírgula para CORS e redirects (ex.: `https://lockpro.vercel.app`) |
| `PUBLIC_API_URL` | Não | Sobrescreve a base pública usada em links de verificação (padrão `${FRONTEND_URL}/api/backend`) |
| `GOOGLE_CALLBACK_URL` | Não | Sobrescreve a `redirect_uri` do Google OAuth (padrão `${PUBLIC_API_URL}/auth/google/callback`) |
| `JWT_SECRET` | Sim | Segredo usado para assinar e verificar os tokens JWT de sessão |
| `JWT_EXPIRES_IN` | Não | Expiração do JWT (padrão `7d`) |
| `REQUIRE_EMAIL_VERIFICATION` | Não | `"true"` exige confirmação de e-mail antes do login por senha |
| `GOOGLE_CLIENT_ID` | Não | Client ID do Google OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | Não | Client Secret do Google OAuth 2.0 |
| `BREVO_API_KEY` | Não | Chave da API HTTP da Brevo (porta 443 — recomendada em hosts que bloqueiam porta 587) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Não | Fallback SMTP tradicional caso `BREVO_API_KEY` não esteja definida |
| `SMTP_FROM` | Não | Remetente dos e-mails (padrão `LockPro <cauakt@gmail.com>`) |

---

## Modelo de Dados (`prisma/schema.prisma`)

### Enums
- `Role`: `USER` | `ADMIN`
- `TokenType`: `EMAIL_VERIFY` | `PASSWORD_RESET`

### Tabelas

| Tabela (`@@map`) | Model | Campos principais & relações |
| --- | --- | --- |
| `users` | `User` | `id` (UUID PK), `email` (unique), `password_hash` (nullable), `google_id` (unique, nullable), `role` (`Role`, default `USER`), `email_verified` (default `false`), `created_at`, `updated_at`. Relações `1:1` com `Profile`, `1:N` com `AuthToken` e `TierList`. |
| `auth_tokens` | `AuthToken` | `id` (UUID PK), `user_id` (FK → `users.id`, `ON DELETE CASCADE`), `type` (`TokenType`), `token_hash` (unique, SHA-256), `expires_at`, `created_at`. Índice em `[user_id, type]`. |
| `profiles` | `Profile` | `id` (UUID PK), `user_id` (unique FK → `users.id`, `ON DELETE CASCADE`), `username` (unique, nullable), `handle` (unique, nullable), `bio`, `avatar_url`, `steam_id`, `favorite_hero_id`, `banner_hero_id`, `banner_image`, `profile_color`, `created_at`, `updated_at`. |
| `tier_lists` | `TierList` | `id` (UUID PK), `user_id` (nullable FK → `users.id`, `ON DELETE SET NULL`), `title`, `author_name`, `tiers` (`Json`), `created_at`, `updated_at`. *(Estrutura preparada para o módulo P3 de TierMaker.)* |

---

## Endpoints

### Saúde
| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET` | `/` | Público | Mensagem básica de status da API |
| `GET` | `/health` | Público | Verifica conectividade com o PostgreSQL (`{"status":"ok","db":"up"}`) |

### Autenticação (`/auth`)
| Método | Rota | Acesso | Rate limit | Descrição |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | Público | 5 / 60s | Cria usuário + perfil, verifica unicidade de e-mail/nick e sempre envia o link de confirmação; abre sessão direta, exceto com `REQUIRE_EMAIL_VERIFICATION="true"` (nesse caso exige confirmar antes do login) |
| `POST` | `/auth/login` | Público | 10 / 60s | Valida credenciais e grava cookie `lockpro_session` |
| `POST` | `/auth/logout` | Público | Global | Limpa o cookie `lockpro_session` |
| `GET` | `/auth/me` | `JwtAuthGuard` | Global | Retorna dados de sessão e resumo do perfil do usuário autenticado |
| `POST` | `/auth/verify-email` | Público | 10 / 60s | Valida token de confirmação de e-mail via corpo JSON |
| `GET` | `/auth/verify-email` | Público | 10 / 60s | Valida `?token=` do link de e-mail e redireciona para `${FRONTEND_URL}/login?verified=1` (ou erro) |
| `POST` | `/auth/resend-verification` | Público | 3 / 60s | Reenvia e-mail de confirmação com resposta genérica anti-enumeração |
| `POST` | `/auth/forgot-password` | Público | 3 / 60s | Gera token `PASSWORD_RESET` (1h) e envia link para `${FRONTEND_URL}/reset-password` |
| `POST` | `/auth/reset-password` | Público | 5 / 60s | Atualiza senha via token e invalida tokens de reset do usuário |
| `GET` | `/auth/google` | Público | 15 / 60s | Grava cookie `lockpro_oauth_state` e redireciona para o consentimento do Google |
| `GET` | `/auth/google/callback` | Público | 15 / 60s | Valida `state`, vincula/cria conta Google, grava `lockpro_session` e redireciona para `/welcome` ou `next` |

### Perfis (`/profiles`)
| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET` | `/profiles/me` | `JwtAuthGuard` | Retorna o perfil completo do usuário autenticado |
| `PUT` | `/profiles/onboarding` | `JwtAuthGuard` | Define `username`, `@handle` e `avatarUrl` no primeiro acesso |
| `PATCH` | `/profiles/me/look` | `JwtAuthGuard` | Atualiza aparência pública do perfil (`username`, `bio`, `handle`, `avatarUrl`, `bannerHeroId`, `bannerImage`) |
| `PATCH` | `/profiles/me/settings` | `JwtAuthGuard` | Atualiza configurações do perfil (`username`, `steamId`, `profileColor`, `favoriteHeroId`, `bannerHeroId`, `bannerImage`) |
| `GET` | `/profiles/community` | `OptionalJwtAuthGuard` | Lista sugestões públicas da comunidade (exclui o próprio usuário quando autenticado) |
| `GET` | `/profiles/by-handle/:handle` | `OptionalJwtAuthGuard` | Retorna visualização pública de um perfil pelo `@handle` (sem expor e-mail ou `steamId`) |

### Administração (`/admin`)
| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET` | `/admin/overview` | `JwtAuthGuard` + `RolesGuard` (`ADMIN`) | Visão geral de contagens do sistema |
| `GET` | `/admin/users` | `JwtAuthGuard` + `RolesGuard` (`ADMIN`) | Lista paginada de usuários com filtro opcional `?search=` |
| `PATCH` | `/admin/users/:id/role` | `JwtAuthGuard` + `RolesGuard` (`ADMIN`) | Altera a role (`USER` / `ADMIN`) de um usuário específico |

---

## Regras de Acesso e Segurança

- **Autenticação (`JwtAuthGuard`):** lê o JWT do cookie `lockpro_session` (ou `Authorization: Bearer`), valida assinatura com `JWT_SECRET` e confirma o usuário no PostgreSQL, anexando `{ userId, email, role }` em `req.user`.
- **Autorização por Role (`RolesGuard` + `@Roles`):** rotas administrativas exigem `role === "ADMIN"`, retornando `403 Forbidden` para usuários comuns.
- **Escopo de Dono do Recurso:** rotas de leitura privada e edição de perfil (`GET /profiles/me`, `PUT /profiles/onboarding`, `PATCH /profiles/me/*`) usam exclusivamente `user.userId` extraído do JWT — nunca aceitam `userId` do corpo ou da URL.
- **Proteção de Dados Públicos:** `GET /profiles/community` e `GET /profiles/by-handle/:handle` expõem apenas campos públicos do perfil (sem `email`, `passwordHash`, `googleId` ou `steamId`).
- **Rate Limiting (`ThrottlerModule`):** limite global de `60` requisições por `60s` por IP (`app.set('trust proxy', 1)` ativo para leitura correta de IP atrás de proxy reverso), com limites mais restritos nas rotas de `/auth/*`.
- **Validação & Payloads:** `ValidationPipe` global configurado com `whitelist: true`, `forbidNonWhitelisted: true` e `transform: true`; limite de body JSON/urlencoded em `2mb`.
````

## File: tsconfig.build.json
````json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "types": ["node", "jest"],
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": ".",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "strictPropertyInitialization": false
  }
}
````
