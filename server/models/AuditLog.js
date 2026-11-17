const mongoose = require('mongoose');
const { Schema } = mongoose;

// Append-only record of who did what. The API only reads and writes new entries, never edits or deletes.
const auditSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorName: String,
    actorEmail: String,
    actorRole: String,
    facility: { type: Schema.Types.ObjectId, ref: 'Facility', index: true },
    action: { type: String, required: true, index: true },
    label: String,
    method: String,
    path: String,
    status: Number,
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditSchema);
