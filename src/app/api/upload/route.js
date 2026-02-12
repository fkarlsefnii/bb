import { NextResponse } from 'next/server';
import B2 from 'backblaze-b2';
import connectDB from '@/lib/db';
import Episode from '@/models/Episode';
import Anime from '@/models/Anime';

const parseTimeToSeconds = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return null;
    const parts = timeString.split(':').map(Number);
    if (parts.some(isNaN)) return null;

    let seconds = 0;
    if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return seconds;
};

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        const path = formData.get('path') || '';
        const animeId = formData.get('animeId');
        const episodeNumber = formData.get('episodeNumber');
        const sourceName = formData.get('sourceName');
        const sourceType = formData.get('sourceType');

        // Timings
        const openingStart = formData.get('openingStart');
        const openingEnd = formData.get('openingEnd');
        const endingStart = formData.get('endingStart');
        const endingEnd = formData.get('endingEnd');

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        // 1. Upload to Backblaze
        const b2 = new B2({
            applicationKeyId: process.env.B2_KEY_ID,
            applicationKey: process.env.B2_APP_KEY
        });

        await b2.authorize();
        const bucketRes = await b2.getBucket({ bucketName: process.env.B2_BUCKET_NAME });
        const bucket = bucketRes.data.buckets[0];

        const uploadUrlRes = await b2.getUploadUrl({ bucketId: bucket.bucketId });
        const { uploadUrl, authorizationToken } = uploadUrlRes.data;

        const buffer = Buffer.from(await file.arrayBuffer());

        const fileName = path + file.name;

        const uploadRes = await b2.uploadFile({
            uploadUrl,
            uploadAuthToken: authorizationToken,
            fileName: fileName,
            data: buffer,
            contentType: file.type || 'application/octet-stream'
        });

        const fileId = uploadRes.data.fileId;
        const publicUrl = `${process.env.B2_ENDPOINT}/${process.env.B2_BUCKET_NAME}/${fileName}`;

        // 2. Sync with MongoDB
        await connectDB();

        const newSource = {
            sourceName: sourceName || 'Tengoku',
            url: publicUrl,
            type: sourceType || 'sub' // Maps to schema 'type' which is enum ['sub', 'dub']
        };

        const timings = {
            openingStart: parseTimeToSeconds(openingStart),
            openingEnd: parseTimeToSeconds(openingEnd),
            endingStart: parseTimeToSeconds(endingStart),
            endingEnd: parseTimeToSeconds(endingEnd),
        };
        // Remove nulls
        Object.keys(timings).forEach(key => timings[key] == null && delete timings[key]);

        // Find Anime to get title if needed (optional, but good for setOnInsert)
        const anime = await Anime.findById(animeId);

        const episode = await Episode.findOneAndUpdate(
            { anime: animeId, episodeNumber: episodeNumber },
            {
                $push: { sources: newSource },
                $set: timings,
                $setOnInsert: {
                    anime: animeId,
                    episodeNumber: episodeNumber,
                    title: anime?.titleRomaji ? `${anime.titleRomaji} - Episode ${episodeNumber}` : `Episode ${episodeNumber}`
                }
            },
            { new: true, upsert: true, runValidators: true }
        );

        return NextResponse.json({ success: true, data: { upload: uploadRes.data, episode } });

    } catch (error) {
        console.error("API Upload Error Detailed:", error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            details: error.response?.data || 'No external API response'
        }, { status: 500 });
    }
}

export const maxDuration = 300; // 5 minutes
