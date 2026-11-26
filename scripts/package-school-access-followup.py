"""Update the approved School access and roll-call screens in a production archive."""
import hashlib
import sys
from zipfile import ZipFile


def replace(code, old, new):
    assert code.count(old) == 1, old[:100]
    return code.replace(old, new, 1)


def admin(code):
    code = replace(code, 'if(h?.length){let A=await q(D.rpc("jds_role_review_queue"));', 'let approvedAccess; if(h?.length){let A=await q(D.rpc("jds_role_review_queue"));')
    code = replace(code, r',k.append(m("h2","Attribuer un r\xF4le")', '; const approved=m("details"); approved.append(m("summary","Accès validés")); approvedAccess=approved; k.append(m("h2","Attribuer un rôle aux demandes en attente")')
    code = replace(code, 'k.append(X),await Nr()}r.append(k)', '(S.status==="approved"?approved:k).append(X),await Nr()}if(k.querySelector("article"))r.append(k)')
    return replace(code, 'r.append(R)}}}await l(),location.hash', 'r.append(R)}}if(approvedAccess?.querySelector("article"))r.append(approvedAccess)}await l(),location.hash')


def teacher(code):
    old = '''if(hasClasses){
  s.append(z("Faire l’appel","bulletins","primary"),z("Saisir les notes","bulletins","secondary-action"));'''
    new = '''if(t?.id){
  const attendance=T("button","Faire l’appel","primary");
  attendance.type="button";
  attendance.onclick=async()=>{
    attendance.disabled=true;
    try { renderScheduledRollCall(s,t,await Ce("jds_scheduled_roll_call",{lesson_key:t.id})); }
    catch(error){ s.append(T("p",error.message||"Impossible de charger l’appel.")); }
    finally { attendance.disabled=false; }
  };
  s.append(attendance);
}
if(hasClasses){
  s.append(z("Saisir les notes","bulletins","secondary-action"));'''
    code = replace(code, old, new)
    code = replace(code, 'Aucun prochain cours publié.', 'Aucune séance ne t’est attribuée pour le moment. Tu n’as rien à renseigner.')
    code = replace(code, 'Ton espace prof est ouvert. L’équipe doit encore t’attribuer tes classes et tes matières.', 'Ton espace prof est prêt. L’équipe t’attribuera une séance si tu interviens. Tu n’as rien à renseigner pour le moment.')
    return replace(code, 'function Wi(t){', '''function renderScheduledRollCall(panel,lesson,data){
  panel.querySelector("[data-session-roll-call]")?.remove();
  const form=T("form");
  form.dataset.sessionRollCall="";
  form.append(T("h3",data.recorded?"Appel enregistré":"Appel de la séance"));
  if(!data.recorded&&!data.can_record)form.append(T("p","L’appel pourra être enregistré à partir du début du cours."));
  if(!data.members.length)form.append(T("p","Aucun élève rattaché à cette classe."));
  const statusLabels={present:"Présent",absent:"Absent",late:"En retard",excused:"Excusé"};
  for(const member of data.members){
    const row=T("fieldset");
    row.append(T("legend",member.name));
    if(data.recorded){
      row.append(T("p",statusLabels[member.status]||"Non renseigné"));
    }else{
      for(const key of ["present","absent"]){
        const label=T("label");
        const input=T("input");
        input.type="radio";
        input.name=member.id;
        input.value=key;
        input.required=true;
        label.append(input,document.createTextNode(" "+statusLabels[key]+" "));
        row.append(label);
      }
    }
    form.append(row);
  }
  const status=T("p");
  status.setAttribute("role","status");
  form.append(status);
  if(!data.recorded&&data.can_record&&data.members.length){
    const submit=T("button","Enregistrer l’appel","primary");
    submit.type="submit";
    form.append(submit);
    form.onsubmit=async event=>{
      event.preventDefault();
      if(submit.disabled)return;
      submit.disabled=true;
      const fields=new FormData(form);
      try {
        const roster=data.members.map(member=>({member_id:member.id,status:fields.get(member.id)}));
        const saved=await Ce("jds_scheduled_roll_call",{lesson_key:lesson.id,roster});
        renderScheduledRollCall(panel,lesson,saved);
      } catch(error){
        status.textContent=error.message||"Impossible d’enregistrer l’appel.";
        submit.disabled=false;
      }
    };
  }
  panel.append(form);
  form.scrollIntoView?.({block:"nearest"});
}
function Wi(t){''')


def package(source, output):
    changes = {
        "app/assets/school-access-feedback-b64c960398.js": admin,
        "app/assets/role-cockpit-v3-6b747ee66e.js": teacher,
    }
    with ZipFile(source) as base, ZipFile(output, "w") as result:
        new = {}
        for name, patch in changes.items():
            data = patch(base.read(name).decode()).encode()
            new[name] = (name[:-3] + "-" + hashlib.sha256(data).hexdigest()[:10] + ".js", data)
        for entry in base.infolist():
            data = base.read(entry)
            if entry.filename.endswith(".html"):
                for name, (replacement, _) in new.items():
                    data = data.replace(("/" + name).encode(), ("/" + replacement).encode())
            result.writestr(entry, data)
        for name, data in new.values():
            result.writestr(name, data, compress_type=8)
            print(name)


if __name__ == "__main__":
    package(*sys.argv[1:])
