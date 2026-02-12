'use server'

import { S3Client, ListObjectsV2Command, DeleteObjectCommand, DeleteObjectsCommand, PutObjectCommand, PutBucketCorsCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import B2 from 'backblaze-b2';
import dbConnect from '@/lib/db';
import Anime from '@/models/Anime';

const s3Client = new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: 'eu-central-003', // Matching the user's B2 region
    forcePathStyle: true, // IMPORTANT: fixes many B2/S3 compat issues
    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APP_KEY
    }
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME;

export async function checkConfig() {
    return {
        configured: !!(process.env.B2_KEY_ID && process.env.B2_APP_KEY && process.env.B2_ENDPOINT && process.env.B2_BUCKET_NAME),
        bucketName: BUCKET_NAME,
        endpoint: process.env.B2_ENDPOINT
    };
}

export async function testB2Connection() {
    try {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            MaxKeys: 1
        });
        await s3Client.send(command);
        return { success: true, message: `Connected to bucket: ${BUCKET_NAME}` };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function configureCors() {
    try {
        const b2 = new B2({
            applicationKeyId: process.env.B2_KEY_ID,
            applicationKey: process.env.B2_APP_KEY
        });

        await b2.authorize();

        // 1. Get Bucket ID
        const response = await b2.getBucket({ bucketName: BUCKET_NAME });
        const bucket = response.data.buckets.find(b => b.bucketName === BUCKET_NAME);

        if (!bucket) {
            throw new Error(`Bucket ${BUCKET_NAME} not found`);
        }

        // 2. Update Bucket with CORS
        await b2.updateBucket({
            bucketId: bucket.bucketId,
            corsRules: [
                {
                    corsRuleName: "allow-all",
                    allowedOrigins: ["*"],
                    allowedHeaders: ["*"],
                    allowedOperations: [
                        "b2_download_file_by_id",
                        "b2_download_file_by_name",
                        "b2_upload_file",
                        "b2_upload_part"
                    ],
                    maxAgeSeconds: 3600
                },
                {
                    corsRuleName: "s3-access",
                    allowedOrigins: ["*"],
                    allowedHeaders: ["*"],
                    allowedOperations: [
                        "s3_delete",
                        "s3_get",
                        "s3_head",
                        "s3_post",
                        "s3_put"
                    ],
                    maxAgeSeconds: 3600
                }
            ]
        });

        return { success: true, message: "CORS Configured via Native B2 API" };
    } catch (error) {
        console.error("B2 Native Error:", error);
        return { success: false, error: error.message || "Unknown B2 Error" };
    }
}

export async function listFiles(prefix = '') {
    try {
        let searchPrefix = prefix;
        if (searchPrefix && !searchPrefix.endsWith('/')) {
            searchPrefix += '/';
        }

        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: searchPrefix,
            Delimiter: '/'
        });

        const response = await s3Client.send(command);

        const folders = (response.CommonPrefixes || []).map(p => ({
            type: 'folder',
            name: p.Prefix.replace(searchPrefix, '').replace('/', ''),
            path: p.Prefix
        }));

        const files = (response.Contents || []).map(f => {
            if (f.Key === searchPrefix) return null;
            return {
                type: 'file',
                name: f.Key.replace(searchPrefix, ''),
                path: f.Key,
                size: f.Size,
                lastModified: f.LastModified
            };
        }).filter(Boolean);

        return { success: true, data: [...folders, ...files] };
    } catch (error) {
        console.error("List Error:", error);
        return { success: false, error: error.message };
    }
}

export async function createFolder(path) {
    try {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: path,
            Body: ''
        });
        await s3Client.send(command);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteItem(key, type) {
    try {
        if (type === 'file') {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key
            }));
        } else {
            // Recursive delete for folder
            let prefix = key;
            if (!prefix.endsWith('/')) prefix += '/';

            const listedObjects = await s3Client.send(new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                Prefix: prefix
            }));

            if (listedObjects.Contents && listedObjects.Contents.length > 0) {
                const deleteParams = {
                    Bucket: BUCKET_NAME,
                    Delete: { Objects: [] }
                };

                listedObjects.Contents.forEach(({ Key }) => {
                    deleteParams.Delete.Objects.push({ Key });
                });

                await s3Client.send(new DeleteObjectsCommand(deleteParams));
            }
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function moveItem(oldKey, newKey) {
    try {
        // S3 move is Copy + Delete
        await s3Client.send(new CopyObjectCommand({
            Bucket: BUCKET_NAME,
            CopySource: `${BUCKET_NAME}/${oldKey}`,
            Key: newKey
        }));

        await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: oldKey
        }));

        return { success: true };
    } catch (error) {
        console.error("Move Error:", error);
        return { success: false, error: error.message };
    }
}

// Generate Presigned URL for Upload (PUT)
export async function getUploadUrl(key, contentType) {
    try {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return { success: true, url };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

import Episode from '@/models/Episode';

// ... (other imports)

// ... (existing code)

// Helper to parse "MM:SS" or "HH:MM:SS" to seconds
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

// 4. Server-Side Upload (Proxy)
export async function uploadFileAction(formData) {
    try {
        const file = formData.get('file');
        const path = formData.get('path') || '';
        const animeId = formData.get('animeId');
        const episodeNumber = formData.get('episodeNumber');
        const sourceName = formData.get('sourceName') || 'Tengoku';
        const sourceType = formData.get('sourceType') || 'sub';

        // Timings
        const openingStart = formData.get('openingStart');
        const openingEnd = formData.get('openingEnd');
        const endingStart = formData.get('endingStart');
        const endingEnd = formData.get('endingEnd');

        if (!file) throw new Error("No file provided");

        await dbConnect(); // Ensure DB connection

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const b2 = new B2({
            applicationKeyId: process.env.B2_KEY_ID,
            applicationKey: process.env.B2_APP_KEY
        });

        await b2.authorize();

        // Get Bucket ID
        const bucketRes = await b2.getBucket({ bucketName: BUCKET_NAME });
        const bucket = bucketRes.data.buckets[0];

        // Get Upload URL
        const uploadUrlRes = await b2.getUploadUrl({ bucketId: bucket.bucketId });
        const { uploadUrl, authorizationToken } = uploadUrlRes.data;

        // Upload
        const fileName = path + file.name;
        const uploadRes = await b2.uploadFile({
            uploadUrl,
            uploadAuthToken: authorizationToken,
            fileName: fileName,
            data: buffer,
            contentType: file.type || 'application/octet-stream'
        });

        // --- Save to MongoDB ---
        if (animeId && episodeNumber) {
            const publicUrl = `https://f003.backblazeb2.com/file/${BUCKET_NAME}/${fileName}`;

            const newSource = {
                sourceName: sourceName,
                url: publicUrl,
                type: sourceType
            };

            const timings = {
                openingStart: parseTimeToSeconds(openingStart),
                openingEnd: parseTimeToSeconds(openingEnd),
                endingStart: parseTimeToSeconds(endingStart),
                endingEnd: parseTimeToSeconds(endingEnd),
            };

            Object.keys(timings).forEach(key => timings[key] == null && delete timings[key]);

            const anime = await Anime.findById(animeId).select('titleRomaji');

            await Episode.findOneAndUpdate(
                { anime: animeId, episodeNumber: episodeNumber },
                {
                    $push: { sources: newSource },
                    $set: timings,
                    $setOnInsert: {
                        anime: animeId,
                        episodeNumber: episodeNumber,
                        title: anime?.titleRomaji || `Episode ${episodeNumber}`
                    }
                },
                { new: true, upsert: true, runValidators: true }
            );
        }

        return { success: true, data: uploadRes.data };
    } catch (error) {
        console.error("Server Upload Error:", error);
        return { success: false, error: error.message };
    }
}

export async function searchAnimeFolders(query) {
    try {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Delimiter: '/',
            MaxKeys: 1000 // Limit to first 1000 folders for performance
        });

        const response = await s3Client.send(command);
        const folders = (response.CommonPrefixes || []).map(p => ({
            name: p.Prefix.replace('/', ''),
            path: p.Prefix
        }));

        if (!query) return { success: true, data: folders };

        const filtered = folders.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
        return { success: true, data: filtered };
    } catch (error) {
        console.error("Search Error:", error);
        return { success: false, error: error.message };
    }
}

export async function searchAnimeInDB(query) {
    try {
        await dbConnect();
        if (!query) return { success: true, data: [] };

        const animes = await Anime.find({
            $or: [
                { titleRomaji: { $regex: query, $options: 'i' } },
                { titleEnglish: { $regex: query, $options: 'i' } },
                { titleAzerbaijani: { $regex: query, $options: 'i' } }
            ]
        }).limit(20).select('titleRomaji titleEnglish titleAzerbaijani coverMedium year status');

        // Format for the frontend
        const formatted = animes.map(anime => ({
            name: anime.titleRomaji || anime.titleEnglish, // Main name for folder
            secondaryName: anime.titleEnglish,
            cover: anime.coverMedium,
            year: anime.startYear,
            id: anime._id.toString()
        }));

        return { success: true, data: formatted };
    } catch (error) {
        console.error("DB Search Error:", error);
        return { success: false, error: error.message };
    }
}
