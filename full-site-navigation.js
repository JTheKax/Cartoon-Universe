/* Cartoon Universe 3.0 consolidated navigation — review only. */
(() => {
  const groups = [
    ["Home", [["Announcements","coming-soon.html?feature=announcements"],["New Releases","coming-soon.html?feature=new-releases"],["Coming Soon","coming-soon.html?feature=coming-soon"]]],
    ["Games", [["Monster Catcher","shop-games-monster-catcher.html"],["Monster Catcher 2","coming-soon.html?feature=monster-catcher-2"],["Racing","coming-soon.html?feature=racing"],["Fighting","coming-soon.html?feature=fighting"],["Retro Games","shop-games-retro-games.html"],["Arcade","shop-games-arcade.html"],["Claw Machine","shop-games-claw-machine.html"],["Prize Wheel","shop-games-prize-wheel.html"]]],
    ["Collect", [["Sets Overview","sets-overview.html"],["My Collection","shop-collect-my-collection.html"],["My Scene","shop-collect-my-scene.html"],["Encyclopedia","shop-collect-encyclopedia.html"],["Wishlist","shop-collect-wishlist.html"]]],
    ["Shop", [["Sticker Store","shop-collectibles.html"],["Yu-Gi-Oh! Card Shop","coming-soon.html?feature=yugioh-card-shop"],["Auction","shop-auctions.html"],["Recycler","shop-recycler.html"],["Trading","coming-soon.html?feature=trading"]]],
    ["Cards", [["Battle","shop-cards-battle.html"],["Deck Builder","shop-cards-deck-build.html"]]],
    ["Watch", "static/theater.html"],
    ["Community", [["Messages","coming-soon.html?feature=messages"],["Forums","shop-community-forums.html"],["Support","shop-community-support.html"],["Help","shop-community-help.html"]]],
    ["Account", [["Login","login.html"],["Register","register.html"],["Profile","account.html"],["Redeem Codes","coming-soon.html?feature=redeem-codes"]]]
  ];
  function build() {
    const header = document.querySelector(".compact-arcade-nav");
    const nav = header?.querySelector("nav");
    if (!nav) return;
    const owner = document.getElementById("nav-owner-tab");
    const fragment = document.createDocumentFragment();
    for (const [name, entries] of groups) {
      if (typeof entries === "string") {
        const a = document.createElement("a");
        a.href = entries; a.textContent = name; a.className = "compact-watch"; fragment.append(a); continue;
      }
      const details = document.createElement("details");
      if (name === "Account") details.className = "compact-account";
      const summary = document.createElement("summary");
      summary.textContent = name.toUpperCase() + " ⌄";
      details.append(summary);
      const panel = document.createElement("div"); panel.className = "compact-options";
      for (const [label, href] of entries) {
        const a = document.createElement("a");
        a.href = href; a.textContent = label;
        if (name === "Account" && label === "Login") a.id = "nav-login-link";
        if (name === "Account" && label === "Register") a.id = "nav-register-link";
        panel.append(a);
      }
      if (name === "Account") {
        const logout = document.createElement("button");
        logout.type = "button"; logout.id = "nav-logout-button";
        logout.hidden = true; logout.textContent = "Log Out";
        panel.append(logout);
      }
      details.append(panel); fragment.append(details);
    }
    if (owner) fragment.append(owner);
    nav.replaceChildren(fragment);
  }
  // Run before defer/module account and owner scripts when possible.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build, {once:true});
  else build();
})();
