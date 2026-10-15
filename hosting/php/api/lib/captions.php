<?php
/** Légendes effectives : les champs « synchronisés » sont recalculés depuis le contenu commun. */

function format_hashtags(array $tags): string
{
    return implode(' ', array_map(fn($t) => '#' . $t, $tags));
}

function join_blocks(array $blocks): string
{
    $blocks = array_values(array_filter(array_map('trim', $blocks), fn($b) => $b !== ''));
    return implode("\n\n", $blocks);
}

function build_caption(array $common): string
{
    return join_blocks([$common['title'] ?? '', $common['description'] ?? '', format_hashtags($common['hashtags'] ?? [])]);
}

function build_youtube_description(array $common): string
{
    return join_blocks([$common['description'] ?? '', format_hashtags($common['hashtags'] ?? [])]);
}

function resolve_options(array $common, array $options): array
{
    $yt = $options['youtube'];
    if ($yt['sync']['title'] ?? true) $yt['title'] = $common['title'] ?? '';
    if ($yt['sync']['description'] ?? true) $yt['description'] = build_youtube_description($common);
    if ($yt['sync']['tags'] ?? true) $yt['tags'] = $common['hashtags'] ?? [];
    $tt = $options['tiktok'];
    if ($tt['sync']['caption'] ?? true) $tt['caption'] = build_caption($common);
    $ig = $options['instagram'];
    if ($ig['sync']['caption'] ?? true) $ig['caption'] = build_caption($common);
    return ['youtube' => $yt, 'tiktok' => $tt, 'instagram' => $ig];
}

function default_options(array $d): array
{
    return [
        'youtube' => [
            'title' => '', 'description' => '', 'tags' => [],
            'sync' => ['title' => true, 'description' => true, 'tags' => true],
            'categoryId' => $d['youtubeCategoryId'], 'privacy' => $d['youtubePrivacy'],
            'madeForKids' => false, 'notifySubscribers' => true, 'embeddable' => true,
            'license' => 'youtube', 'containsSyntheticMedia' => false, 'defaultLanguage' => $d['youtubeLanguage'], 'format' => 'auto',
        ],
        'tiktok' => [
            'caption' => '', 'sync' => ['caption' => true], 'mode' => 'direct', 'privacyLevel' => '',
            'allowComments' => $d['tiktokAllowComments'], 'allowDuet' => $d['tiktokAllowDuet'], 'allowStitch' => $d['tiktokAllowStitch'],
            'coverTimestampMs' => 0, 'commercialContent' => false, 'yourBrand' => false, 'brandedContent' => false, 'isAigc' => false, 'autoAddMusic' => true,
        ],
        'instagram' => [
            'caption' => '', 'sync' => ['caption' => true], 'shareToFeed' => $d['instagramShareToFeed'],
            'thumbOffsetMs' => 0, 'collaborators' => [], 'audioName' => '', 'locationId' => '',
        ],
    ];
}
