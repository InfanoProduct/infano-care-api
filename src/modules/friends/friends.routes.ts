import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.js";
import { getProfile, updateProfile, discoverProfiles, getNearbyFriends, getSaved, swipeFriend, getMatches, unmatch, deleteProfile, toggleDiscovery } from "./friends.controller.js";
import { getMessages, reportMatch, blockMatch } from "./friends.chat.controller.js";

const router = Router();

router.use(authenticate);

router.get("/profile",    getProfile);
router.post("/profile",   updateProfile);
router.get("/discover",   discoverProfiles);
router.get("/nearby",     getNearbyFriends);
router.get("/saved",      getSaved);
router.post("/swipe",     swipeFriend);
router.get("/matches",    getMatches);
router.delete("/profile", deleteProfile);
router.put("/profile/toggle-discovery", toggleDiscovery);
router.delete("/matches/:id", unmatch);

// Friend Chat
router.get("/chats/:match_id/messages", getMessages);
router.post("/chats/:match_id/report", reportMatch);
router.post("/chats/:match_id/block", blockMatch);

export default router;
