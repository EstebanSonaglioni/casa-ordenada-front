"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { getHouseholds, getHouseholdMembers, inviteToHousehold, Household, HouseholdMember, setActiveHousehold } from "../lib/auth";

export default function HouseholdPage() {
  const [houses, setHouses] = useState<Household[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"member" | "owner">("member");
  const [message, setMessage] = useState("");

  useEffect(() => { void getHouseholds().then((items) => { setHouses(items); if (items[0]) { setSelected(items[0].id); void setActiveHousehold(items[0].id); } }); }, []);
  useEffect(() => { if (selected) { void setActiveHousehold(selected); void getHouseholdMembers(selected).then(setMembers); } }, [selected]);

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try { await inviteToHousehold(selected, username, role); setUsername(""); setMessage("Invitación enviada."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos enviar la invitación"); }
  }

  const house = houses.find((item) => item.id === selected);
  return <main className="dashboard-shell"><AppHeader /><section className="dashboard-content"><div className="dashboard-panel"><span className="eyebrow">Casa</span><h1>Personas que comparten tu hogar</h1>{houses.length > 1 && <label>Casa<select value={selected ?? ""} onChange={(event) => setSelected(Number(event.target.value))}>{houses.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}<div className="item-list">{members.map((member) => <p key={member.user_id}><strong>{member.display_name}</strong> · @{member.username} · {member.role}</p>)}</div>{house?.role === "owner" && <form className="manager-form" onSubmit={invite}><label>Usuario a invitar<input value={username} onChange={(event) => setUsername(event.target.value)} required /></label><label>Rol<select value={role} onChange={(event) => setRole(event.target.value as "member" | "owner")}><option value="member">Member</option><option value="owner">Owner</option></select></label><button className="primary-button form-submit" type="submit">Invitar<span>→</span></button></form>}{message && <p className="muted" role="status">{message}</p>}</div></section></main>;
}
