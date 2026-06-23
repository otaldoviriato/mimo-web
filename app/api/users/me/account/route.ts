import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { GalleryItem } from '@/models/GalleryItem';
import { Transaction } from '@/models/Transaction';
import { MicroTransaction } from '@/models/MicroTransaction';
import { WithdrawRequest } from '@/models/WithdrawRequest';

export const dynamic = 'force-dynamic';

export async function PATCH() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const user = await User.findOneAndUpdate(
            { clerkId: userId },
            {
                $set: {
                    isSuspended: true,
                    suspendedAt: new Date(),
                    fcmToken: '',
                    fcmTokens: [],
                    isOnline: false,
                    lastSeen: new Date(),
                },
            },
            { returnDocument: 'after' }
        );

        if (!user) {
            return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error suspending user account:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const rooms = await Room.find({ participants: userId }).select('_id').lean();
        const roomIds = rooms.map((room: any) => room._id);

        await Promise.all([
            User.findOneAndDelete({ clerkId: userId }),
            GalleryItem.deleteMany({ ownerId: userId }),
            Transaction.deleteMany({ userId }),
            MicroTransaction.deleteMany({
                $or: [
                    { senderId: userId },
                    { receiverId: userId },
                ],
            }),
            WithdrawRequest.deleteMany({ userId }),
            Message.deleteMany({
                $or: [
                    { roomId: { $in: roomIds } },
                    { senderId: userId },
                    { receiverId: userId },
                ],
            }),
            Room.deleteMany({ participants: userId }),
            User.updateMany(
                { subscribers: userId },
                { $pull: { subscribers: userId } }
            ),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting user account:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
