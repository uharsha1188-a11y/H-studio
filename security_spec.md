# Security Specification - Glass Chat

## Data Invariants
1. A room must have a unique 8-12 digit code.
2. A message cannot be sent to a room unless the sender is either the host or the guest of that room.
3. Once a guest joins, the `guestId` and `hostId` are immutable.
4. Room status moves from `waiting` to `active` once a guest joins.

## The "Dirty Dozen" Payloads (Examples)
1. **Identity Spoofing**: Attempt to create a room with someone else's `hostId`.
   - `{"hostId": "other_user", "code": "12345678", ...}` -> **DENIED**
2. **Room Hijacking**: Attempt to update a room's `hostId` after creation.
   - `{"hostId": "new_host", ...}` -> **DENIED**
3. **Ghost Guest**: Join a room by setting `guestId` without being authenticated.
   - (Unauthenticated request) -> **DENIED**
4. **Code Poisoning**: Create a room with a 1MB string as a code.
   - `{"code": "A".repeat(1024*1024), ...}` -> **DENIED**
5. **Unauthorized Eavesdropping**: Read messages of a room where the user is not a participant.
   - (User C reading Room AB) -> **DENIED**
6. **Message Impersonation**: Send a message with `senderId` matching the other participant.
   - `{"senderId": "partner_id", ...}` -> **DENIED**
7. **Bypassing State**: Update room status directly to `active` without setting a guest.
   - `{"status": "active"}` (without guestId) -> **DENIED**
8. **Spamming Messages**: Send a 1MB text message.
   - `{"text": "A".repeat(1024*1024), ...}` -> **DENIED**
9. **Creation Theft**: Create a message in a room that doesn't exist.
   - (Post to `/rooms/nonexistent/messages/...`) -> **DENIED** (parent check)
10. **Immutable History**: Attempt to update an existing message.
    - (Update request to `/rooms/{id}/messages/{id}`) -> **DENIED**
11. **Deletion Attack**: Attempt to delete a room or message.
    - (Delete request) -> **DENIED** (unless owner/admin)
12. **Query Scraping**: Attempt to list all rooms.
    - (`getDocs(collection(db, 'rooms'))`) -> **DENIED** (must query by code)

## Test Runner logic (implied in firestore.rules)
...
