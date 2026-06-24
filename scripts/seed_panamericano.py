"""
Seed el Barrio Panamericano en Turso (producción) y/o local.
Crea:
- 1 zona: Barrio Panamericano
- 3 áreas: Panamericano A, B, C
- 3 reuniones de coordinación con las notas reales del usuario
"""
import json
import urllib.request
import urllib.error
import sys

DB_URL = "https://mision-db-shadowwolfsubs.aws-us-east-1.turso.io"
TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODIyNzQzMDUsImlkIjoiMDE5ZWY3ZDMtN2UwMS03YjAzLWE3NzgtZDE2NzhjOWRjZDdmIiwicmlkIjoiODI4MTczZjEtZTBlMC00NzczLThhZDAtOTM0OWIwZDY3Y2ZmIn0.K05t9-9QY-ITEjEPUM1nC19SfRqW-pkKpomZ8XATZX82pby9UVWIU6C_O3YrIw_QnDBPMYXUOmaWkSKlTCtFAw"

URL = f"{DB_URL}/v2/pipeline"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# Generar IDs únicos (UUID sin guiones)
import uuid
def cuid():
    return uuid.uuid4().hex

def execute_sql(sql: str, args: list = None) -> dict:
    """Ejecuta SQL en Turso. Args deben ser strings."""
    # Convertir args simples a formato Turso: {"type": "text"|"integer"|"null", "value": ...}
    typed_args = []
    for a in (args or []):
        if a is None:
            typed_args.append({"type": "null", "value": None})
        elif isinstance(a, int):
            typed_args.append({"type": "integer", "value": str(a)})
        else:
            typed_args.append({"type": "text", "value": str(a)})

    body = {
        "requests": [
            {"type": "execute", "stmt": {"sql": sql, "args": typed_args}},
            {"type": "close"}
        ]
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(URL, data=data, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()}

# === Datos del seed ===
ZONE_ID = cuid()
AREA_A_ID = cuid()
AREA_B_ID = cuid()
AREA_C_ID = cuid()

MEETING_A_ID = cuid()
MEETING_B_ID = cuid()
MEETING_C_ID = cuid()

# Agenda items para cada reunión
agenda_a = [
    ("Bautismo Familia Ornelas", "Madre y 4 hijos. Hija de 15, hijo de 14, gemelos de 12. Se bautizan el 28 de junio.", "Coordinar ropa bautismal y fellowshippers: Hna. Pereda, Karina, Sandy, y Presidente de Hombres Jóvenes"),
    ("Bautismo Familia Dueñas", "El y sus dos hijos. Fecha: 4 de julio.", "Coordinar todo para el bautismo"),
]
agenda_b = [
    ("Hermana Pancha y Hermano David", "Son mayores, les gusta la iglesia pero la hermana está enferma. Invitación bautismal tentativa para 4 de julio.", "Seguir visitando y apoyando"),
    ("Alejandra García", "Vive en laderas. Necesita raíz urgente, varios hermanos que le puedan ayudar. MAS MINISTRACIÓN.", "Asignar fellowshippers y organizar raíz"),
    ("Hermana Inactiva Valeria Valenzuela", "Familia parcial, algunos miembros. Valeria entre 30 y 40 años, hijo de 21 e hija de 16 (la hija es la única no miembro). Tal vez una noche de hogar donde los inviten.", "Coordinar noche de hogar para toda la familia"),
    ("Pareja no casada", "Necesitan un matrimonio que les ayude a ver que casarse sería bueno para acercarse a Dios. Cita mañana a las 7:30pm.", "Asignar matrimonio fellowshipping y confirmar cita"),
    ("Hermana inactiva en laderas y su nieto Diego", "Necesitan raíz y visitarles.", "Coordinar visitas y raíz"),
]
agenda_c = [
    ("Hermana Yaneth de López", "Esposa de Alejandro Fierro. Mencionada en coordinación.", "Seguimiento misional"),
    ("Korina y su hijo Edén", "Korina es miembro, Edén se bautizará. Cita este Jueves a las 5 de la tarde en La Quemada.", "Coordinar bautismo de Edén — cita confirmada jueves 5pm en La Quemada"),
]

# === Insertar ===
print("1. Creando zona Barrio Panamericano...")
r = execute_sql(
    'INSERT INTO "Zone" (id, name, description, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)',
    [ZONE_ID, "Barrio Panamericano", "Barrio Panamericano dividido en 3 áreas misionales: A, B y C", "2026-06-24T00:00:00.000Z", "2026-06-24T00:00:00.000Z"]
)
print(f"   Zona: {'OK' if r.get('results', [{}])[0].get('type') == 'ok' else r}")

print("2. Creando áreas Panamericano A, B, C...")
for area_id, name in [(AREA_A_ID, "Panamericano A"), (AREA_B_ID, "Panamericano B"), (AREA_C_ID, "Panamericano C")]:
    r = execute_sql(
        'INSERT INTO "Area" (id, name, "zoneId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)',
        [area_id, name, ZONE_ID, "2026-06-24T00:00:00.000Z", "2026-06-24T00:00:00.000Z"]
    )
    print(f"   {name}: {'OK' if r.get('results', [{}])[0].get('type') == 'ok' else r}")

print("3. Creando reuniones de coordinación...")

# Reunión A
r = execute_sql(
    'INSERT INTO "CorrelationMeeting" (id, "areaId", "meetingDate", leader, attendees, vision, priorities, notes, commitments, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
        MEETING_A_ID, AREA_A_ID, "2026-06-24T00:00:00.000Z",
        "Líder Misional de Barrio",
        "Elderes del área Panamericano A",
        "Asegurar que los bautismos de junio y julio salgan perfectos. Cada investigador con su ropa bautismal y fellowshippers asignados con anticipación.",
        "1. Bautismo familia Ornelas (28 junio). 2. Bautismo familia Dueñas (4 julio).",
        "Panamericano A\nFamilia ornelas madre y 4 hijos se bautisan el 28 de junio hija de 15 hijo 14 y otros dos niños gemelos de 12 necesitamos ropa, hermana pereda, Karina o sandy y pdte de hombres jovenes.\nfamilia dueñas bautismo 4 de julio el y sus dos hijos.",
        "- Conseguir ropa bautismal para familia Ornelas (5 personas)\n- Asignar fellowshippers: Hna. Pereda, Karina o Sandy, y Presidente de Hombres Jóvenes\n- Coordinar bautismo familia Dueñas 4 julio",
        "2026-06-24T00:00:00.000Z", "2026-06-24T00:00:00.000Z"
    ]
)
print(f"   Reunión A: {'OK' if r.get('results', [{}])[0].get('type') == 'ok' else r}")

# Reunión B
r = execute_sql(
    'INSERT INTO "CorrelationMeeting" (id, "areaId", "meetingDate", leader, attendees, vision, priorities, notes, commitments, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
        MEETING_B_ID, AREA_B_ID, "2026-06-24T00:00:00.000Z",
        "Líder Misional de Barrio",
        "Elderes del área Panamericano B",
        "Priorizar la ministración y fellowshipping en laderas. Apoyar a los investigadores mayores con visitas constantes.",
        "1. Hermana Pancha y David (bautismo tentativo 4 julio). 2. Alejandra García (raíz urgente). 3. Valeria Valenzuela (noche de hogar). 4. Pareja no casada (cita mañana). 5. Hermana inactiva en laderas y nieto Diego.",
        "Panamericano B\nHermana pancha y hermano david son mayores, les gusta la iglesia pero la hermana esta enferma, invitacion bautismal, tentativa para 4 de julio\nAlejandra Garcia necesita rait urgente que varios hermanos le puedan ayudar vive en laderas, MAS MINISTRACION.\nHermana Inactiva Valeria Valenzuela familia parcial algunos miembros valeria entre 30 y 40, hijo de 21 e hija de 16 (la hija es la unica no miembro), talvez una noche de hogar donde los inviten\nPareja aun no casada necesitan un matrimonio que les ayuden a ver que casarse seria bueno para acercarse a Dios. Cita mañana a las 7:30pm\nHermana inactiva en laderas y su nieto Diego, rait y visitarles",
        "- Visitar Hna. Pancha y Hno. David\n- Coordinar raíz para Alejandra García con varios hermanos\n- Organizar noche de hogar para familia Valenzuela\n- Asignar matrimonio fellowshipping para la pareja no casada\n- Visitar a hermana inactiva en laderas con su nieto Diego",
        "2026-06-24T00:00:00.000Z", "2026-06-24T00:00:00.000Z"
    ]
)
print(f"   Reunión B: {'OK' if r.get('results', [{}])[0].get('type') == 'ok' else r}")

# Reunión C
r = execute_sql(
    'INSERT INTO "CorrelationMeeting" (id, "areaId", "meetingDate", leader, attendees, vision, priorities, notes, commitments, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
        MEETING_C_ID, AREA_C_ID, "2026-06-24T00:00:00.000Z",
        "Líder Misional de Barrio",
        "Elderes del área Panamericano C",
        "Coordinar el bautismo de Edén este jueves. Apoyar a Yaneth y seguir el progreso misional.",
        "1. Bautismo de Edén (jueves 5pm, La Quemada). 2. Seguimiento de Yaneth de López.",
        "Panamericano C\nHermana - Yaneth de Lopez Alejandro Fierro.\nKorina miembro y su hijo Eden su hijo se bautisara cita este Jueves a las 5 de la tarde en la quemada.",
        "- Confirmar bautismo de Edén este jueves 5pm en La Quemada\n- Continuar enseñando a Yaneth de López (esposa de Alejandro Fierro)\n- Fellowshipping para Korina y Edén",
        "2026-06-24T00:00:00.000Z", "2026-06-24T00:00:00.000Z"
    ]
)
print(f"   Reunión C: {'OK' if r.get('results', [{}])[0].get('type') == 'ok' else r}")

# Agenda items
print("4. Creando items de agenda...")
all_agenda = []
for i, (topic, discussion, action) in enumerate(agenda_a):
    all_agenda.append((cuid(), MEETING_A_ID, topic, discussion, action, "PENDIENTE"))
for i, (topic, discussion, action) in enumerate(agenda_b):
    all_agenda.append((cuid(), MEETING_B_ID, topic, discussion, action, "PENDIENTE"))
for i, (topic, discussion, action) in enumerate(agenda_c):
    all_agenda.append((cuid(), MEETING_C_ID, topic, discussion, action, "PENDIENTE"))

for item_id, meeting_id, topic, discussion, action, status in all_agenda:
    r = execute_sql(
        'INSERT INTO "AgendaItem" (id, "meetingId", topic, discussion, action, status, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [item_id, meeting_id, topic, discussion, action, status, "2026-06-24T00:00:00.000Z", "2026-06-24T00:00:00.000Z"]
    )
print(f"   {len(all_agenda)} items creados")

print("\n✓ Seed completado!")
print(f"  Zona: Barrio Panamericano (ID: {ZONE_ID})")
print(f"  Áreas: Panamericano A, B, C")
print(f"  Reuniones: 3 (una por área) con notas reales")
print(f"  Agenda items: {len(all_agenda)}")
