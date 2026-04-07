-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "parent_password_hash" TEXT,
    "parent_first_name" TEXT,
    "parent_last_name" TEXT,
    "age_group" TEXT NOT NULL DEFAULT '3-13',
    "predefined_filters" JSONB NOT NULL DEFAULT '{"violence": true, "fear": true, "profanity": true, "adult": true}',
    "custom_keywords" JSONB NOT NULL DEFAULT '[]',
    "daily_time_limit_minutes" INTEGER,
    "free_video_limit" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_quota" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "daily_video_count" INTEGER NOT NULL DEFAULT 0,
    "last_reset_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "trial_used" BOOLEAN NOT NULL DEFAULT false,
    "trial_start_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approved_channels" (
    "id" SERIAL NOT NULL,
    "channel_id" TEXT NOT NULL,
    "channel_name" TEXT NOT NULL,
    "channel_thumbnail" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approved_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_history" (
    "id" SERIAL NOT NULL,
    "video_id" TEXT NOT NULL,
    "video_title" TEXT NOT NULL,
    "channel_id" TEXT,
    "channel_name" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "analysis_result" JSONB,
    "watched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "video_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3) NOT NULL,
    "paytr_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_approvals" (
    "id" SERIAL NOT NULL,
    "video_id" TEXT NOT NULL,
    "video_title" TEXT NOT NULL,
    "channel_id" TEXT,
    "channel_name" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "analysis_result" JSONB,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_quota_user_id_key" ON "user_quota"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "approved_channels_channel_id_key" ON "approved_channels"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "pending_approvals_video_id_key" ON "pending_approvals"("video_id");
