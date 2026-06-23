"""Generate all section imagery for Aangan via Gemini Nano Banana.
All people depicted are universal Indian (not regionally specific).
Wardrobe palette matches the hero: warm ivory, sage, soft beige, muted sand."""
import asyncio
import base64
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / 'backend' / '.env')

from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402

OUT = ROOT / 'frontend' / 'public' / 'generated'
OUT.mkdir(parents=True, exist_ok=True)

STYLE_BASE = (
    "Editorial documentary photograph, 50mm lens, shallow depth of field, soft golden "
    "afternoon light, paper-grain film texture. Warm ivory and soft sand palette with "
    "sage green accents and a hint of muted terracotta. Premium, intimate, unposed. "
    "No logos, no text, no Indian temple imagery, no religious symbols, no festival "
    "decorations, no saffron-heavy colours, no flags, no marigold strings. Quiet, "
    "luxurious editorial mood — like a frame from a family-memoir magazine. "
)

# People prompt: universal Indian, NOT regionally identifiable
PEOPLE = (
    "All people are Indian ethnicity but PAN-INDIAN and visually neutral — could be from "
    "any part of India. Modern, unornamented, minimalist clothing in cream, ivory, sage "
    "green, soft beige, and warm earth tones. NO sarees, NO sherwanis, NO bindis, NO "
    "tilak, NO turbans, NO regional jewellery, NO regional braids, NO state-specific "
    "garments. Skin tones range medium warm to medium-deep. Wholesome, candid, modern. "
)

TARGETS = [
    (
        'hero-family',
        STYLE_BASE + PEOPLE +
        "A family of FOUR — mother, father, and TWO young sons (around 7 and 10 years old) "
        "— sitting together on a soft cream rug in a modern home with warm wooden shelves "
        "and natural daylight from a window behind them. ALL FOUR PEOPLE ARE CLEARLY "
        "VISIBLE IN THE FRAME — both sons fully in shot, not cropped. Mother wears a "
        "loose ivory linen kurta or top. Father wears a soft sage-green sweater over an "
        "ivory shirt. Younger son in a sage-green sweater, older son in a cream sweater. "
        "Mother is gently reading from a small leather-bound notebook; the younger son "
        "leans against her shoulder listening. Father holds a small cup of tea. Older son "
        "lies on his stomach on the rug, sketching with a pencil. Composition is "
        "horizontal, all four faces visible, soft smiles, intimate, unposed. Wide framing."
    ),
    (
        'cooking',
        STYLE_BASE + PEOPLE +
        "A grandmother and her adult daughter cooking together at a warm wooden kitchen "
        "counter in a modern home. Grandmother wears a simple cream cotton kurta (no "
        "regional embroidery); daughter wears a soft sage linen top. They are kneading "
        "dough together, hands gently dusted with flour. Warm afternoon light through a "
        "window. A small bowl of besan and a brass cup of milk on the counter. Intimate, "
        "quiet, generational. Faces gentle, soft smiles, candid."
    ),
    (
        'grandparents',
        STYLE_BASE + PEOPLE +
        "A loving elderly Indian couple in their late 60s sitting close together on a "
        "soft cream couch in a softly lit modern living room. He wears a fine ivory "
        "kurta-shirt with sage trim; she wears a simple cream cotton kurta. He has "
        "silver hair, gentle eyes; she has silver-streaked hair pulled back simply. They "
        "are sharing a quiet moment looking through a small handwritten notebook "
        "together. Warm afternoon light. Tender, unposed."
    ),
    (
        'celebration',
        STYLE_BASE + PEOPLE +
        "A multigenerational Indian family of five or six gathered around a low wooden "
        "table at home for a small intimate celebration — NOT a festival, just a family "
        "moment. Soft ivory tablecloth, simple ceramic plates, a small lit ivory candle "
        "in the centre, fresh white and sage-coloured flowers in a clay pot. Two "
        "grandparents, two parents, two children (one boy, one girl). All in cream, "
        "ivory and sage clothing. Everyone laughing softly, mid-conversation. Warm "
        "evening light. Modern Indian home — wooden floor, neutral walls."
    ),
    (
        'archival',
        STYLE_BASE +
        "A flat-lay still life on a warm wooden surface — a stack of vintage Indian "
        "family black-and-white photographs (1950s–1980s, sepia and warm grey tones), a "
        "small leather-bound notebook, a fountain pen, a pressed flower, and a folded "
        "ivory handkerchief with simple sage embroidery. No regional motifs. Soft "
        "daylight. Quiet, archival, editorial. No faces visible in the photographs (or "
        "if visible, very small, neutral, no regional clothing)."
    ),
    (
        'handsRecipe',
        STYLE_BASE + PEOPLE +
        "Close-up of two pairs of Indian hands — a grandmother's hands (older, gentle, "
        "warmly lit) and a child's hands (small, learning) — together rolling small "
        "round besan ladoo on a warm wooden surface dusted with sugar. Soft ivory linen "
        "sleeves visible at the edges. No regional jewellery, no bangles, no rings. "
        "Warm afternoon light. Tactile, intimate, generational. No faces in shot — "
        "only hands and the ladoo."
    ),
    (
        'notebook',
        STYLE_BASE +
        "A flat-lay of a vintage cream-coloured Indian family recipe notebook, open to "
        "a handwritten page in faded blue ink (Devanagari and Roman script mixed, "
        "illegible from a distance), with a small sage-coloured ribbon bookmark. Beside "
        "it: a brass measuring spoon, a few cardamom pods, a sprig of dried curry leaf, "
        "and a soft ivory linen napkin. Warm wooden surface, soft daylight. No religious "
        "symbols. Editorial, archival."
    ),
    (
        'diwaliLamp',
        STYLE_BASE +
        "A single warm clay diya (small oil lamp) on a soft cream linen cloth on a warm "
        "wooden table, flame gently lit, golden glow. NO religious imagery, NO temple, "
        "NO festival decorations, NO marigold flowers, NO rangoli. Just one quiet lamp "
        "in soft dawn light. Behind it, a slightly blurred view of a ceramic teapot and "
        "a folded ivory napkin. Minimalist, editorial, contemplative."
    ),
    (
        'calendarHero',
        STYLE_BASE + PEOPLE +
        "A modern Indian family of four (couple plus a girl and a boy, both around 8-10) "
        "sitting at a low wooden coffee table at home, looking at a cream paper "
        "calendar / planner together. Mother is pointing at a date with a pencil. Soft "
        "ivory and sage clothing. Warm afternoon light. Intimate, planning, gentle. "
        "Modern Indian home with wooden shelves and neutral walls. No festival visuals."
    ),
    (
        'childListening',
        STYLE_BASE + PEOPLE +
        "A grandmother (Indian, around 65, silver hair pulled back, wearing a soft cream "
        "kurta) telling a story to her grandson (around 8, wearing a sage-green sweater) "
        "in a warmly-lit modern living room. They are sitting side by side on a low "
        "wooden bench, leaning towards each other. He is listening intently, looking up "
        "at her face. Her hands are gesturing softly as she speaks. Warm afternoon "
        "light. Quiet, tender, intergenerational."
    ),
    (
        'table',
        STYLE_BASE + PEOPLE +
        "A modern Indian family of five seated around a long wooden dining table for a "
        "simple weeknight dinner at home — no festival. Soft ivory tablecloth, simple "
        "ceramic bowls of dal, rice, sabzi (no specific regional dish visible). "
        "Grandfather at the head, mother and father on either side, two children "
        "(one boy, one girl). Everyone in cream, ivory, sage clothing. Mid-conversation, "
        "soft laughter. Warm evening light from above. Wooden floor, neutral walls. "
        "Candid, unposed, editorial."
    ),
    (
        'oldPhoto',
        STYLE_BASE +
        "A flat-lay of three or four vintage Indian family photographs (1950s-1980s, "
        "warm sepia and faded colour), spread loosely on a warm wooden surface, with a "
        "small leather-bound notebook to the side. The photos show small everyday "
        "family moments (no faces clearly visible, neutral, no regional clothing "
        "detectable). Soft daylight, paper grain, archival mood. Editorial."
    ),
]


async def gen_one(name: str, prompt: str):
    key = os.environ['EMERGENT_LLM_KEY']
    chat = LlmChat(
        api_key=key,
        session_id=f'gen-{name}',
        system_message='You are an editorial photographer for a premium family memoir magazine.',
    )
    chat.with_model('gemini', 'gemini-3.1-flash-image-preview').with_params(modalities=['image', 'text'])
    msg = UserMessage(text=prompt)
    print(f'[{name}] start', flush=True)
    try:
        text, images = await chat.send_message_multimodal_response(msg)
        if not images:
            print(f'[{name}] NO IMAGE: {str(text)[:120]}', flush=True)
            return
        img = images[0]
        path = OUT / f'{name}.jpg'
        path.write_bytes(base64.b64decode(img['data']))
        print(f'[{name}] saved {len(img["data"])//1024}kb -> {path.name}', flush=True)
    except Exception as e:  # noqa: BLE001
        print(f'[{name}] FAILED: {e}', flush=True)


async def main():
    # Run in parallel batches of 4 to be respectful to rate limits
    BATCH = 4
    for i in range(0, len(TARGETS), BATCH):
        chunk = TARGETS[i:i + BATCH]
        await asyncio.gather(*(gen_one(n, p) for n, p in chunk))


if __name__ == '__main__':
    asyncio.run(main())
