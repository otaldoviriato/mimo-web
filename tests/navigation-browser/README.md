# Navigation regression checks

The fixture imports the production stack provider and History API helpers into an
isolated Next.js 16 app. The provider stays in the layout, as it does in Mimo.
It has no authentication, API calls, database access, or production data.

From `mimo-web`:

```sh
npm run test:navigation
npm run test:navigation:browser
```

Open `http://localhost:3010/chat/ana/info` and check:

1. The destination is `chatInfo`, the base is `/chats`, and neither screen has
   `animate: true`. Only the destination has `mounted: true`.
2. **App back** reaches `/chat/ana` once. **Forward** restores `/info` and animates
   its entry. The displayed document ID stays unchanged.
3. **Reload** changes the document ID but preserves screen keys and history length;
   it does not animate entry. Repeating reload does not add parents.
4. **Back two** reaches `/chats`; Forward can restore both ancestors in order.
5. **Next search tab**, then **Open chat**, keeps `/search` as the base. Back returns
   to `/search`, including after reloading the chat.
6. **Open overlay**, then **Browser history back**, leaves the chat open; the next
   back reaches the base. This tests the stack/overlay boundary, not gallery UI.
7. **Canonical URL**, then reload, keeps the screen key and does not add parents.
8. Direct `/settings` uses `/profile` as base. `/ana` uses `/chats`.
   `/ana/chat?gift=ABC` and `/chats?openChat=ana&gift=ABC` resolve to a chat stack.

Also exercise fast back/forward and jumps in the browser's history menu. Initial
synthetic entries may be skipped by browser UI before user interaction; this is a
browser policy, not an application navigation guarantee.

This fixture verifies Next/History/React integration. Authenticated rendering,
touch gestures and device-specific behavior still require validation in the full
application on Android Chrome and iOS Safari/PWA.
