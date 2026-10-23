const assert=require('node:assert/strict'),esbuild=require('esbuild'),{JSDOM}=require('jsdom');
const React=require('../node_modules/react'),{createRoot}=require('../node_modules/react-dom/client');
const {act}=React;
const dom=new JSDOM('<div id="root"></div>',{url:'https://school.test/app/admin'});
Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
const calls=[],routes=[];let loggedIn=true;
const data={generated_at:'2026-10-23T07:00:00Z',name:'Direction test',campuses:['CORE','INDUSTRY'],central:true,can_teacher_ranking:false,groups:[{id:'group-test',campus:'CORE',name:'P1',season:'2026-2027'}],actions:[{key:'access',bucket:'decision',campus:'CORE',group_id:'group-test',detail:'teacher',count:2},{key:'documents',bucket:'draft',campus:'CORE',group_id:'group-test',detail:'',count:3}],agenda:[],members:12,published_bulletins:0,rental_imports:[]};
function node(tag){return p=>{const {children,style,accessibilityRole,accessibilityLabel,onPress,...rest}=p;const props={...(tag==='button'?{type:'button',onClick:onPress}:{}),role:accessibilityRole,'aria-label':accessibilityLabel};return React.createElement(tag,props,children);};}
const mocks={
 'expo-router':`const React=require('react');exports.useFocusEffect=(cb)=>React.useEffect(cb,[cb]);exports.useRouter=()=>({push:p=>global.__cockpitRoutes.push(p)});`,
 'react-native':`const React=require('react');const node=global.__cockpitNode;exports.View=node('div');exports.ScrollView=node('div');exports.Text=node('span');exports.Pressable=node('button');exports.ActivityIndicator=node('div');exports.Linking={openURL:p=>global.__cockpitRoutes.push(p)};exports.StyleSheet={create:x=>x};`,
 'react-native-safe-area-context':`exports.useSafeAreaInsets=()=>({top:0});`,
 '@/components/training/ui':`const React=require('react');exports.TrainingButton=p=>React.createElement('button',{onClick:p.onPress,disabled:p.disabled},p.title);exports.TrainingField=p=>React.createElement('label',null,p.label,React.createElement('input',{value:p.value,onChange:e=>p.onChange(e.target.value)}));`,
 '@/constants/brand':`exports.Palette={};exports.Radius={};`,
 '@/lib/auth':`exports.useAuth=()=>({session:global.__cockpitLoggedIn()?{user:{id:'test-user'}}:null,initializing:false});`,
 '@/lib/rental-calendar':`exports.parisDay=()=> '2026-10-23';exports.slotTime=s=>s.slice(11,16);`,
 '@/lib/school-web-links':`exports.schoolWebUrl=p=>'https://school.test/app'+p;`,
 '@/lib/school-cockpit':`exports.getSchoolCockpit=async(...args)=>{global.__cockpitCalls.push(args);return global.__cockpitData};exports.cockpitActionLabels={access:'Demandes d’accès à valider',documents:'Documents et annonces en brouillon'};exports.cockpitActionPath=(a,t)=>'/school-role.html?campus='+a.campus+'&term='+t;`
};
(async()=>{global.__cockpitNode=node;global.__cockpitData=data;global.__cockpitCalls=calls;global.__cockpitRoutes=routes;global.__cockpitLoggedIn=()=>loggedIn;
 const bundle=await esbuild.build({entryPoints:['../src/app/admin-cockpit.tsx'],absWorkingDir:__dirname,bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'mocks',setup(b){b.onResolve({filter:/.*/},args=>mocks[args.path]?{path:args.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js'}));}}]});
 const m={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,m,m.exports);const Screen=m.exports.default;
 const root=createRoot(document.getElementById('root'));await act(async()=>{root.render(React.createElement(Screen));});
 assert.match(document.body.textContent,/Bonjour Direction test/);assert.equal(calls.length,1);assert.doesNotMatch(document.body.textContent,/Ranking professeurs · confidentiel/);
 assert.match(document.body.textContent,/Demandes d’accès à valider/);assert.doesNotMatch(document.body.textContent,/Documents et annonces en brouillon/);
 const click=async text=>act(async()=>{[...document.querySelectorAll('button')].find(b=>b.textContent===text).click();});
 await click('Brouillons et prévisions');assert.match(document.body.textContent,/Documents et annonces en brouillon/);assert.match(document.body.textContent,/ne sont pas des validations en retard/);
 await click('INDUSTRY');assert.equal(calls.at(-1)[0],'INDUSTRY');
 await act(async()=>root.unmount());loggedIn=false;const signedOut=createRoot(document.getElementById('root'));await act(async()=>signedOut.render(React.createElement(Screen)));
 assert.match(document.body.textContent,/Connexion School requise/);assert.doesNotMatch(document.body.textContent,/Direction test/);await click('Me connecter');assert.equal(routes.at(-1),'/login');
 await act(async()=>signedOut.unmount());dom.window.close();console.log('PASS: authenticated cockpit data, campus refresh, separate drafts, restricted teacher-ranking module, signed-out login gate.');
})().catch(e=>{console.error(e);process.exitCode=1;});
