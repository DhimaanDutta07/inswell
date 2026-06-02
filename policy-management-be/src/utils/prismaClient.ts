//src/utils/prismaClient.ts
import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient;
}

// On Vercel serverless, limit connections to prevent pool exhaustion
function getDatabaseUrl(): string {
    const url = process.env.DATABASE_URL || '';
    if (!url) return url;
    // Add connection_limit=1 for serverless environments to prevent pool exhaustion
    if (process.env.VERCEL && !url.includes('connection_limit=')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}connection_limit=1`;
    }
    return url;
}

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: getDatabaseUrl(),
            },
        },
    });
};

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

export default prisma;
