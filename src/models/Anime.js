
// models/Anime.js
import mongoose from 'mongoose';

const RelationSchema = new mongoose.Schema({
    relationType: { type: String },
    anilistId: { type: Number },
    titleRomaji: { type: String },
    titleEnglish: { type: String, default: '' },
    titleAzerbaijani: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    slug: { type: String, default: '' },
}, { _id: false });

const AnimeSchema = new mongoose.Schema({
    anilistId: { type: Number, unique: true, index: true, required: true },

    // --- Title Fields ---
    titleRomaji: { type: String, required: true },
    titleEnglish: { type: String, default: '' },
    titleNative: { type: String, default: '' },
    titleTurkish: { type: String, default: '' },
    titleAzerbaijani: { type: String, default: '' },

    slug: { type: String, required: true, unique: true, lowercase: true },

    // --- Description Fields ---
    descRomaji: { type: String, default: '' },
    descTurkish: { type: String, default: '' },
    descAzerbaijani: { type: String, default: '' },

    // --- Cover Image Fields ---
    coverLarge: { type: String, default: '' },
    coverMedium: { type: String, default: '' },
    bannerImage: { type: String, default: '' },

    format: { type: String, enum: ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'], default: 'TV' },
    status: { type: String, enum: ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED'], default: 'NOT_YET_RELEASED' },
    episodes: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    averageScore: { type: Number, default: null },

    // --- Date Fields ---
    startYear: { type: Number, default: null },
    startMonth: { type: Number, default: null },
    startDay: { type: Number, default: null },
    endYear: { type: Number, default: null },
    endMonth: { type: Number, default: null },
    endDay: { type: Number, default: null },

    genres: { type: [String], default: [] },
    tags: { type: [String], default: [] },

    // --- Trailer Fields ---
    trailerId: { type: String, default: '' },
    trailerSite: { type: String, default: '' },
    trailerThumb: { type: String, default: '' },

    // --- Relations ---
    relations: { type: [RelationSchema], default: [] },

    isAdult: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Anime || mongoose.model('Anime', AnimeSchema);
