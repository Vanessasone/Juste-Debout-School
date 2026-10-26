<?php
/**
 * Plugin Name: School CORE — Smash Balloon bridge (experimental)
 * Description: Public feed-only endpoint for an existing WordPress companion. Not installed in production.
 * Version: 0.1.0
 */
if (!defined('ABSPATH')) { exit; }
add_action('template_redirect', function () {
    if (!isset($_GET['school-core-feed']) || $_GET['school-core-feed'] !== '1') { return; }
    // This route only: never change protection of wp-admin or other pages.
    header_remove('X-Frame-Options');
    $parent = defined('JDS_CORE_FEED_PARENT_ORIGIN') ? JDS_CORE_FEED_PARENT_ORIGIN : 'https://www.juste-debout-school.com';
    $valid = preg_match('~^https://[a-z0-9.-]+(?::[0-9]+)?$~iD', $parent);
    $test = defined('JDS_CORE_FEED_TEST_MODE') && JDS_CORE_FEED_TEST_MODE === true
        && preg_match('~^http://127\.0\.0\.1:[0-9]+$~D', $parent);
    if (!$valid && !$test) { status_header(503); exit('Feed configuration unavailable.'); }
    header("Content-Security-Policy: frame-ancestors 'self' " . $parent);
    header('X-Robots-Tag: noindex, nofollow');
    nocache_headers();
    $feed_id = absint(get_option('jds_core_feed_id', 0));
    $ready = $feed_id > 0 && shortcode_exists('instagram-feed');
    if (!$ready) { status_header(503); }
    // Render before wp_head: shortcode may enqueue its own assets.
    $feed = $ready ? do_shortcode('[instagram-feed feed="' . $feed_id . '" num="6" cols="3" colsmobile="2"]') : '';
    ?>
<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Instagram — Juste Debout School CORE</title>
<?php wp_head(); ?>
<style>html,body{margin:0;padding:0;background:#131719;color:#eef1f3;font-family:Arial,sans-serif}main{padding:8px}a{color:inherit}.pending{padding:24px;line-height:1.5}</style>
</head><body><main id="jds-feed">
<?php if ($ready) { echo $feed; } else { ?>
<p class="pending">Le fil Instagram CORE sera disponible après sa connexion par l’administrateur.</p>
<?php } ?>
</main><?php wp_footer(); ?>
<script>
(() => {
 const parentOrigin = <?php echo wp_json_encode($parent, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
 let lastHeight = 0;
 const resize = () => {
   const height = Math.ceil(document.getElementById('jds-feed').getBoundingClientRect().height);
   if (height > 0 && height <= 20000 && height !== lastHeight) {
     lastHeight = height;
     window.parent.postMessage({type:'jds-core-feed-height',height}, parentOrigin);
   }
 };
 new ResizeObserver(resize).observe(document.getElementById('jds-feed'));
 window.addEventListener('load', resize); resize();
})();
</script></body></html>
<?php exit;
}, 0);
