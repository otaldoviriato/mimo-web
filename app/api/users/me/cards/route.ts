import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/db';
import { User, type ICard } from '@/models/User';

export const dynamic = 'force-dynamic';

const MAX_SAVED_CARDS = 10;

function sanitizeCard(card: ICard) {
    return {
        id: card.id,
        label: card.label,
        lastFour: card.lastFour,
        brand: card.brand,
        createdAt: card.createdAt,
    };
}

// POST /api/users/me/cards - Save non-sensitive card metadata
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const label = typeof body.label === 'string' ? body.label.trim() : '';
        const lastFour = typeof body.lastFour === 'string' ? body.lastFour.trim() : '';
        const brand = typeof body.brand === 'string' ? body.brand.trim() : '';

        if (!label || label.length > 80) {
            return NextResponse.json({ error: 'Invalid card label' }, { status: 400 });
        }

        if (!/^\d{4}$/.test(lastFour)) {
            return NextResponse.json({ error: 'Invalid card digits' }, { status: 400 });
        }

        if (!brand || brand.length > 40) {
            return NextResponse.json({ error: 'Invalid card brand' }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if ((user.savedCards || []).length >= MAX_SAVED_CARDS) {
            return NextResponse.json({ error: 'Saved card limit reached' }, { status: 400 });
        }

        const existingCard = (user.savedCards || []).find(
            (card) => card.lastFour === lastFour && card.brand.toLowerCase() === brand.toLowerCase()
        );

        if (existingCard) {
            return NextResponse.json({ card: sanitizeCard(existingCard) });
        }

        const card = {
            id: randomUUID(),
            label,
            lastFour,
            brand,
            createdAt: new Date(),
        };

        user.savedCards.push(card);
        await user.save();

        return NextResponse.json({ card: sanitizeCard(card) }, { status: 201 });
    } catch (error) {
        console.error('Error saving card:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/users/me/cards - Remove saved card metadata
export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const cardId = typeof body.cardId === 'string' ? body.cardId.trim() : '';

        if (!cardId) {
            return NextResponse.json({ error: 'Card id is required' }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findOneAndUpdate(
            { clerkId: userId },
            { $pull: { savedCards: { id: cardId } } },
            { returnDocument: 'after' }
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            savedCards: (user.savedCards || []).map(sanitizeCard),
        });
    } catch (error) {
        console.error('Error removing card:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
