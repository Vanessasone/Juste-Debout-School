import {runCLI} from '@wp-playground/cli';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=fileURLToPath(new URL('.',import.meta.url));
const pluginDir=process.env.SMASHBALLOON_PLUGIN_DIR;
if(!pluginDir) throw new Error('Set SMASHBALLOON_PLUGIN_DIR to the extracted official instagram-feed directory.');
const checks=[];
function check(name,condition){assert.ok(condition,name);checks.push(name);console.log('PASS',name);}
const bridge=await readFile(new URL('./wordpress/jds-core-feed.php',import.meta.url),'utf8');
const server=await runCLI({command:'server',php:'8.3',wp:'7.1.3',port:9431,workers:1,login:false,
 'mount-before-install':[
 {hostPath:resolve(pluginDir),vfsPath:'/wordpress/wp-content/plugins/instagram-feed'},
 {hostPath:resolve(here,'wordpress'),vfsPath:'/wordpress/wp-content/plugins/jds-core-feed'}],
 blueprint:{steps:[
 {step:'activatePlugin',pluginPath:'instagram-feed/instagram-feed.php'},
 {step:'activatePlugin',pluginPath:'jds-core-feed/jds-core-feed.php'},
 {step:'setSiteOptions',options:{blogname:'CORE isolated feed test',blog_public:0}}]}});
try{
 const probe=await server.playground.run({code:`<?php require '/wordpress/wp-load.php'; echo json_encode(['php'=>PHP_VERSION,'wordpress'=>get_bloginfo('version'),'plugin'=>SBIVER,'shortcode'=>shortcode_exists('instagram-feed'),'anonymous'=>!is_user_logged_in()]);`});
 const versions=JSON.parse(probe.text);
 check('Official plugin activated and shortcode registered',versions.plugin==='6.14.0'&&versions.shortcode);
 check('Test runs anonymously',versions.anonymous);
 const response=await fetch(new URL('/?school-core-feed=1',server.serverUrl));
 const pending=await response.text();
 check('Unconnected feed returns truthful unavailable state',response.status===503&&pending.includes('après sa connexion'));
 check('Only canonical School origin may embed the feed',response.headers.get('content-security-policy')=== "frame-ancestors 'self' https://www.juste-debout-school.com");
 check('Feed route has no conflicting X-Frame-Options',!response.headers.has('x-frame-options'));
 check('Feed endpoint is excluded from indexing',response.headers.get('x-robots-tag')==='noindex, nofollow');
 check('Resize messages target the exact School origin',pending.includes('https:\\/\\/www.juste-debout-school.com')&&pending.includes('jds-core-feed-height'));
 const login=await fetch(new URL('/wp-login.php',server.serverUrl));
 check('Login frame protection remains enabled',login.headers.get('x-frame-options')==='SAMEORIGIN');
 const set=await server.playground.run({code:"<?php require '/wordpress/wp-load.php'; update_option('jds_core_feed_id',999999); echo 'configured-test-id';"});
 assert.equal(set.text,'configured-test-id');
 const configured=await fetch(new URL('/?school-core-feed=1',server.serverUrl));
 const html=await configured.text();
 check('Configured endpoint executes actual Smash Balloon shortcode',configured.status===200&&html.includes('sbi_mod_error'));
 check('Missing Instagram configuration is reported by official plugin',html.includes('No feed')||html.includes('no feed'));
 const assets=[...html.matchAll(/(?:src|href)=["']([^"']*\/plugins\/instagram-feed\/[^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].map(x=>x[1].replaceAll('&#038;','&'));
 check('Plugin frontend CSS and JS are enqueued',assets.some(x=>/\.css/.test(x))&&assets.some(x=>/\.js/.test(x)));
 for(const asset of [...new Set(assets)]){const r=await fetch(new URL(asset,server.serverUrl));assert.equal(r.status,200,asset);}
 check('All enqueued plugin frontend assets return HTTP 200',true);
 const report={date:'2026-10-26',environment:'isolated WordPress Playground; SQLite; anonymous HTTP requests',versions,bridgeSha256:createHash('sha256').update(bridge).digest('hex'),checks,notTested:['Paid Pro plugin and licence','Real Instagram authorization and posts','Automatic refresh and WP-Cron on permanent hosting','Cross-origin rendering, resize and mobile/lightbox behaviour in a browser','Actual WordPress hosting security headers and integration with Netlify'],productionChanged:false};
 await writeFile(new URL('./test-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{await server[Symbol.asyncDispose]();}
