
import mongoose from 'mongoose';

const SourceSchema = new mongoose.Schema({
    sourceName: {
        type: String,
        required: true,
        trim: true,
    },
    url: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['sub', 'dub'],
        required: true,
    },
}, { timestamps: true, _id: true });

const EpisodeSchema = new mongoose.Schema({
    anime: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Anime',
        required: true,
        index: true,
    },
    episodeNumber: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
        default: '',
    },
    openingStart: { type: Number, default: null },
    openingEnd: { type: Number, default: null },
    endingStart: { type: Number, default: null },
    endingEnd: { type: Number, default: null },
    sources: {
        type: [SourceSchema],
        default: [],
    },
    watchedByUsers: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        default: [],
    },
    watchedByGuests: {
        type: [String],
        default: [],
    },
    likedBy: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        default: [],
    },
}, { timestamps: true });

EpisodeSchema.index(
    { anime: 1, episodeNumber: 1 },
    { unique: true }
);

export default mongoose.models.Episode || mongoose.model('Episode', EpisodeSchema);
