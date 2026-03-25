import { clerkClient, auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const client = await clerkClient();
        const users = await client.users.getUserList();
        
        const mappedUsers = users.data.map(u => ({
            id: u.id,
            email: u.emailAddresses[0]?.emailAddress,
            role: (u.publicMetadata.role as string) || 'Citizen'
        }));
        
        return NextResponse.json(mappedUsers);
    } catch (e: any) {
        console.error('GET /api/clerk/users error:', e);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId, role } = await req.json();
        const client = await clerkClient();
        
        await client.users.updateUserMetadata(userId, {
            publicMetadata: { role }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('POST /api/clerk/users error:', e);
        return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }
}
