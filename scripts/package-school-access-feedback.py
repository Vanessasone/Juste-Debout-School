"""Apply the access feedback fixes to the complete, currently published School archive."""

import argparse
import hashlib
from pathlib import Path
from zipfile import ZipFile


def replace_once(code, old, new):
    if code.count(old) != 1:
        raise ValueError(f"Unexpected production bundle: {old[:100]}")
    return code.replace(old, new, 1)


def access_portal(code):
    code = replace_once(code, 'Quelle est ta fonction ?', 'Quels accès veux-tu demander ?')
    code = replace_once(
        code, 'U.append(pe),v.append(_,U,',
        '''U.append(pe);
let extraRoleLabel=m("label",null,"role-option"),extraRole=m("input"),extraRoleText=m("span");
extraRole.type="checkbox";
extraRoleLabel.append(extraRole,extraRoleText);
v.append(_,U,extraRoleLabel,''')
    code = replace_once(code, 'v.hidden=A==="open",Y.hidden', '''let staff=A==="teacher"||A==="team";
extraRoleLabel.hidden=!staff;
extraRoleLabel.style.display=staff?"":"none";
extraRoleText.textContent=A==="teacher"?"Je fais aussi partie de l’équipe":"Je suis aussi professeur";
if(!staff)extraRole.checked=false;
let needsSubjects=A==="teacher"||(A==="team"&&extraRole.checked);
v.hidden=A==="open",Y.hidden''')
    code = replace_once(code, 'U.hidden=A!=="teacher",pe.required=A==="teacher"', 'U.hidden=!needsSubjects,pe.required=needsSubjects')
    code = replace_once(
        code,
        '(k==="teacher"||k==="team")&&await q(D.rpc("jds_submit_access_request",{request_kind:k,school:x.value,subjects:pe.value})),await q(',
        '''(k==="teacher"||k==="team")&&await submitRoles(k),await q(''')
    anchor = 'g.onchange=jr,jr(),g.onsubmit='
    code = replace_once(code, anchor, '''g.onchange=jr;
jr();
async function submitRoles(primary){
  const secondary=primary==="teacher"?"team":"teacher";
  const kinds=extraRole.checked?[primary,secondary]:[primary];
  for (const kind of kinds) {
    await q(D.rpc("jds_submit_access_request",{
      request_kind:kind,school:x.value,subjects:kind==="teacher"?pe.value:""
    }));
  }
}
g.onsubmit=''')
    old = r'k.status==="approved"&&k.kind==="teacher"&&R.append(m("p","Ton statut professeur est valid\xE9 pour cette \xE9cole. Ouvre l\u2019espace prof pour acc\xE9der aux classes et aux mati\xE8res qui te sont attribu\xE9es.","muted")),'
    code = replace_once(code, old, '''(k.status==="approved"&&k.kind==="teacher"&&(()=>{
  R.append(m("p","Ton accès professeur est validé. Tes classes apparaîtront dès que l’équipe t’aura attribué des cours.","muted"));
  const link=m("a","Ouvrir mon espace prof →");
  link.href=Ke("/cockpit?espace=professeur");
  R.append(link);
})()),''')
    return code


def teacher_cockpit(code):
    code = replace_once(
        code,
        'if(e==="professeur"&&l)return Ki(await Ce("jds_my_next_teaching_session"),i.length?i:o);',
        '''if(e==="professeur"&&l){
  let nextCourse=null;
  let scheduleUnavailable=false;
  try { nextCourse=await Ce("jds_my_next_teaching_session"); }
  catch { scheduleUnavailable=true; }
  return Ki(nextCourse,i.length?i:o,o.length>0,scheduleUnavailable);
}''')
    code = replace_once(code, 'function Ki(t,e){', 'function Ki(t,e,hasClasses,scheduleUnavailable){')
    code = replace_once(
        code,
        r's.append(T("p","Aucun cours publi\xE9 pour toi. Si ton acc\xE8s prof vient d\u2019\xEAtre valid\xE9, l\u2019\xE9quipe peut encore devoir t\u2019attribuer tes mati\xE8res et tes classes.")),s.append(z("Faire l\u2019appel","bulletins","primary")),s.append(z("Saisir les notes","bulletins","secondary-action")),gr([["\u2302","Accueil","cockpit?espace=professeur"],["\u25A4","Classes","bulletins"],["\u25CE","Profil","edit-profile"]])',
        '''s.append(T("p",scheduleUnavailable?"Le planning est momentanément indisponible. Actualise la page pour réessayer.":hasClasses?"Aucun prochain cours publié.":"Ton espace prof est ouvert. L’équipe doit encore t’attribuer tes classes et tes matières."));
if(hasClasses){
  s.append(z("Faire l’appel","bulletins","primary"),z("Saisir les notes","bulletins","secondary-action"));
}else{
  s.append(z("Voir mes accès","school-role","secondary-action"));
}
gr([["⌂","Accueil","cockpit?espace=professeur"],
    hasClasses?["▤","Classes","bulletins"]:["▤","Mes accès","school-role"],
    ["◎","Profil","edit-profile"]])''')
    code = replace_once(code, 'let c=[["Ma formation","mon-tableau-de-bord"],["Mon QR code","wallet"],["Cours Open","planning"]];', '''const studentRequests=await fr(dr.from("jds_access_requests").select("id").eq("profile_id",t.user.id).eq("kind","student")).catch(()=>null);
let c=[["Mon QR code","wallet"],["Cours Open","planning"]];
if((!l&&!a&&!s)||studentRequests?.length)c.unshift(["Ma formation","mon-tableau-de-bord"]);''')
    return code


def student_dashboard(code):
    return replace_once(
        code,
        r'if(!r.length){se.replaceChildren(T("h1","Mon tableau de bord"),T("p","Ton compte doit \xEAtre rattach\xE9 \xE0 ta promotion."),tt("Voir mes demandes","school-role"));return}',
        '''if(!r.length){
  let requests=await ur(cr.from("jds_access_requests").select("status").eq("profile_id",t.user.id).eq("kind","student")).catch(()=>null);
  const pending=requests?.some(request=>request.status==="pending");
  const text=pending?"Ton école vérifie ta demande de rattachement à une promotion.":requests===null?"Impossible de vérifier tes demandes pour le moment.":"Aucune promotion de formation n’est liée à ce compte.";
  se.replaceChildren(T("h1","Ma formation"),T("p",text),tt("Mes espaces School","cockpit"),tt("Voir mes demandes","school-role"));
  return;
}''')


def expo(code):
    changes = [
        (r'8 caract\xe8res minimum. L\u2019\xe9quipe v\xe9rifiera s\xe9par\xe9ment ton rattachement \xe0 une promotion.',
         '8 caractères minimum. Tu choisiras tes accès après avoir confirmé ton adresse e-mail.'),
        (r'Connexion au service impossible. V\xe9rifie ta connexion internet puis r\xe9essaie.',
         'Le service de connexion n’a pas répondu. Réessaie dans quelques instants. Si le problème continue, ouvre ce lien dans Safari ou Chrome.'),
        (r'Ton dossier n\u2019est pas encore rattach\xe9', 'Aucune promotion liée à ce compte'),
        (r'L\u2019\xe9quipe doit v\xe9rifier ta fiche et rattacher ton compte \xe0 ta promotion. Les cours open restent consultables dans le planning g\xe9n\xe9ral.',
         'Si tu es élève en formation, vérifie ta demande dans « Ma fonction · Mes accès ». Retrouve tes autres espaces depuis l’accueil School.'),
    ]
    for old, new in changes:
        code = replace_once(code, old, new)
    return replace_once(code, "switch(t?.code){case'invalid_credentials':", """if(t?.status>=500)return "Le service de connexion est momentanément indisponible. Réessaie dans quelques minutes.";
switch(t?.code){case'invalid_credentials':""")


def patch_archive(source, destination):
    assets = {
        'app/assets/school-access-feedback.js': access_portal,
        'app/assets/role-cockpit-v3.js': teacher_cockpit,
        'app/assets/student-dashboard-v2.js': student_dashboard,
        'app/_expo/static/js/web/entry-jds-mobile-corrections.js': expo,
    }
    with ZipFile(source) as original, ZipFile(destination, "w") as release:
        updated = {}
        for name, patch in assets.items():
            data = patch(original.read(name).decode()).encode()
            stem, suffix = name.rsplit('.', 1)
            new_name = f"{stem}-{hashlib.sha256(data).hexdigest()[:10]}.{suffix}"
            updated[name] = (new_name, data)
        for entry in original.infolist():
            data = original.read(entry)
            if entry.filename.endswith('.html'):
                for old, (new, _) in updated.items():
                    data = data.replace(f"/{old}".encode(), f"/{new}".encode())
            release.writestr(entry, data)
        for new, data in updated.values():
            release.writestr(new, data, compress_type=8)
            print(new)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    arguments = parser.parse_args()
    patch_archive(arguments.source, arguments.destination)
