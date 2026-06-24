"""
Seed el Barrio Panamericano en la DB local (SQLite vía API local).
"""
import json
import urllib.request
import urllib.error
import uuid

BASE = "http://localhost:3000/api"

def post(path, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()}

# 1. Limpiar zona anterior si existe
print("0. Verificando zonas existentes...")
try:
    with urllib.request.urlopen(f"{BASE}/zones", timeout=10) as r:
        zones = json.loads(r.read())
    for z in zones:
        # eliminar
        req = urllib.request.Request(f"{BASE}/zones/{z['id']}", method="DELETE")
        try:
            urllib.request.urlopen(req, timeout=10)
            print(f"   Zona eliminada: {z['name']}")
        except Exception as e:
            print(f"   No se pudo eliminar {z['name']}: {e}")
except Exception as e:
    print(f"   Error verificando zonas: {e}")

# 2. Crear zona
print("1. Creando zona Barrio Panamericano...")
zone = post("/zones", {"name": "Barrio Panamericano", "description": "Barrio Panamericano dividido en 3 áreas misionales: A, B y C"})
zone_id = zone.get("id")
print(f"   Zona ID: {zone_id}")

# 3. Crear áreas
print("2. Creando áreas...")
areas = {}
for name in ["Panamericano A", "Panamericano B", "Panamericano C"]:
    a = post("/areas", {"name": name, "zoneId": zone_id})
    areas[name] = a.get("id")
    print(f"   {name}: {a.get('id')}")

# 4. Crear reuniones con notas reales
print("3. Creando reuniones de coordinación...")

# Reunión A
meeting_a = post("/correlation", {
    "areaId": areas["Panamericano A"],
    "meetingDate": "2026-06-24",
    "leader": "Líder Misional de Barrio",
    "attendees": "Elderes del área Panamericano A",
    "vision": "Asegurar que los bautismos de junio y julio salgan perfectos. Cada investigador con su ropa bautismal y fellowshippers asignados con anticipación.",
    "priorities": "1. Bautismo familia Ornelas (28 junio). 2. Bautismo familia Dueñas (4 julio).",
    "notes": "Panamericano A\nFamilia ornelas madre y 4 hijos se bautisan el 28 de junio hija de 15 hijo 14 y otros dos niños gemelos de 12 necesitamos ropa, hermana pereda, Karina o sandy y pdte de hombres jovenes.\nfamilia dueñas bautismo 4 de julio el y sus dos hijos.",
    "commitments": "- Conseguir ropa bautismal para familia Ornelas (5 personas)\n- Asignar fellowshippers: Hna. Pereda, Karina o Sandy, y Presidente de Hombres Jóvenes\n- Coordinar bautismo familia Dueñas 4 julio",
    "agendaItems": [
        {"topic": "Bautismo Familia Ornelas", "discussion": "Madre y 4 hijos. Hija de 15, hijo de 14, gemelos de 12. Se bautizan el 28 de junio.", "action": "Coordinar ropa bautismal y fellowshippers: Hna. Pereda, Karina, Sandy, y Presidente de Hombres Jóvenes"},
        {"topic": "Bautismo Familia Dueñas", "discussion": "El y sus dos hijos. Fecha: 4 de julio.", "action": "Coordinar todo para el bautismo"},
    ]
})
print(f"   Reunión A: {meeting_a.get('id', meeting_a)}")

# Reunión B
meeting_b = post("/correlation", {
    "areaId": areas["Panamericano B"],
    "meetingDate": "2026-06-24",
    "leader": "Líder Misional de Barrio",
    "attendees": "Elderes del área Panamericano B",
    "vision": "Priorizar la ministración y fellowshipping en laderas. Apoyar a los investigadores mayores con visitas constantes.",
    "priorities": "1. Hermana Pancha y David (bautismo tentativo 4 julio). 2. Alejandra García (raíz urgente). 3. Valeria Valenzuela (noche de hogar). 4. Pareja no casada (cita mañana). 5. Hermana inactiva en laderas y nieto Diego.",
    "notes": "Panamericano B\nHermana pancha y hermano david son mayores, les gusta la iglesia pero la hermana esta enferma, invitacion bautismal, tentativa para 4 de julio\nAlejandra Garcia necesita rait urgente que varios hermanos le puedan ayudar vive en laderas, MAS MINISTRACION.\nHermana Inactiva Valeria Valenzuela familia parcial algunos miembros valeria entre 30 y 40, hijo de 21 e hija de 16 (la hija es la unica no miembro), talvez una noche de hogar donde los inviten\nPareja aun no casada necesitan un matrimonio que les ayuden a ver que casarse seria bueno para acercarse a Dios. Cita mañana a las 7:30pm\nHermana inactiva en laderas y su nieto Diego, rait y visitarles",
    "commitments": "- Visitar Hna. Pancha y Hno. David\n- Coordinar raíz para Alejandra García con varios hermanos\n- Organizar noche de hogar para familia Valenzuela\n- Asignar matrimonio fellowshipping para la pareja no casada\n- Visitar a hermana inactiva en laderas con su nieto Diego",
    "agendaItems": [
        {"topic": "Hermana Pancha y Hermano David", "discussion": "Son mayores, les gusta la iglesia pero la hermana está enferma. Invitación bautismal tentativa para 4 de julio.", "action": "Seguir visitando y apoyando"},
        {"topic": "Alejandra García", "discussion": "Vive en laderas. Necesita raíz urgente, varios hermanos que le puedan ayudar. MAS MINISTRACIÓN.", "action": "Asignar fellowshippers y organizar raíz"},
        {"topic": "Hermana Inactiva Valeria Valenzuela", "discussion": "Familia parcial, algunos miembros. Valeria entre 30 y 40 años, hijo de 21 e hija de 16 (la hija es la única no miembro). Tal vez una noche de hogar donde los inviten.", "action": "Coordinar noche de hogar para toda la familia"},
        {"topic": "Pareja no casada", "discussion": "Necesitan un matrimonio que les ayude a ver que casarse sería bueno para acercarse a Dios. Cita mañana a las 7:30pm.", "action": "Asignar matrimonio fellowshipping y confirmar cita"},
        {"topic": "Hermana inactiva en laderas y su nieto Diego", "discussion": "Necesitan raíz y visitarles.", "action": "Coordinar visitas y raíz"},
    ]
})
print(f"   Reunión B: {meeting_b.get('id', meeting_b)}")

# Reunión C
meeting_c = post("/correlation", {
    "areaId": areas["Panamericano C"],
    "meetingDate": "2026-06-24",
    "leader": "Líder Misional de Barrio",
    "attendees": "Elderes del área Panamericano C",
    "vision": "Coordinar el bautismo de Edén este jueves. Apoyar a Yaneth y seguir el progreso misional.",
    "priorities": "1. Bautismo de Edén (jueves 5pm, La Quemada). 2. Seguimiento de Yaneth de López.",
    "notes": "Panamericano C\nHermana - Yaneth de Lopez Alejandro Fierro.\nKorina miembro y su hijo Eden su hijo se bautisara cita este Jueves a las 5 de la tarde en la quemada.",
    "commitments": "- Confirmar bautismo de Edén este jueves 5pm en La Quemada\n- Continuar enseñando a Yaneth de López (esposa de Alejandro Fierro)\n- Fellowshipping para Korina y Edén",
    "agendaItems": [
        {"topic": "Hermana Yaneth de López", "discussion": "Esposa de Alejandro Fierro. Mencionada en coordinación.", "action": "Seguimiento misional"},
        {"topic": "Korina y su hijo Edén", "discussion": "Korina es miembro, Edén se bautizará. Cita este Jueves a las 5 de la tarde en La Quemada.", "action": "Coordinar bautismo de Edén — cita confirmada jueves 5pm en La Quemada"},
    ]
})
print(f"   Reunión C: {meeting_c.get('id', meeting_c)}")

print("\n✓ Seed local completado!")
print(f"  Reuniones creadas: A={meeting_a.get('id')}, B={meeting_b.get('id')}, C={meeting_c.get('id')}")
