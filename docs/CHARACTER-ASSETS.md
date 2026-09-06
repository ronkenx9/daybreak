# Daybreak plush character collection — 2026-09-06

Owner references: supplied X banner and square composition showing glossy ceramic heads, chrome glasses, fluffy hats and stock enamel pins. Built-in image generation used to create six transparent PNG character assets in public/assets/characters/. Original generated masters remain under ~/.codex/generated_images/.

Shared prompt: one centered floating spherical ceramic character head with expressive cartoon eyes, chrome glasses, luminous crack lines, dense tactile plush headwear and realistic enamel stock badges. Match the owner's reference craftsmanship. Front view, complete hat/head, transparent background, no body, no slogan or watermark.

Variations: midnight (black trapper, Apple/NVIDIA); cloud (white trapper, Microsoft); electric (blue trapper, Amazon); racer (blue bucket, Tesla); orbit (white beanie, Intel); afterhours (black cap, Coinbase).

These are six complete avatar/headwear looks. Profile selection uses the existing avatar integer 0–5, preserving local and existing account API compatibility. Independently swappable pins, face expressions and hat layers are future customization work. Stock badges express interests and never certify holdings.

Integration: shared Avatar replaces previous sprite everywhere; three-head CharacterCrew in landing hero and Discover feature; individual characters in landing feature cards and circle cards; profile wardrobe with named headwear, selected state and enlarged preview. Next Image serves appropriately sized assets; reduced motion disables crew float.

Verification: TypeScript check and production build pass. All six PNGs have RGBA color type 6. Browser verifies all six images load, the headwear selection changes the enlarged preview/header and survives reload, and the profile document stays 390px wide at a 390px viewport. Landing hero and mobile wardrobe visually reviewed. Account API uses the existing avatar field; authenticated cross-device saving was not exercised in this asset pass. Build retains pre-existing Privy optional Farcaster and ox/viem dependency warnings.

## Poster and landing expansion
Three editorial posters extend the same plush/chrome/enamel art direction: interest (AI/gaming with chip/controller), watchlist (glass saved-stock cards/bookmark), culture (expressive heads/speech bubble). Source prompts ask for portrait 4:5, generous borders, no generated text; accessible captions and labels are HTML. Production files: public/assets/posters/{interest,watchlist,culture}.png.

LandingStories adds three sections: community globe with four surrounding character heads; three editorial feature posters; six-look wardrobe lineup linking to profile. The globe has no real-user location markers. Planned shared watchlists and meme discovery are explicitly described as upcoming, with links to existing pages.

Poster pass validation: final production build passes after correcting the client-component boundary. Browser visually confirms all three posters and the restored globe with four heads. Latest expanded preview: http://127.0.0.1:3020/. Existing transitive build warnings remain unchanged.
