# Rift Clash — Play Rules (Prototype v0.2)

Rift Clash is an original, offline Cartoon Universe card battler. It does not use Yu-Gi-Oh! cards, art, or rules.

## Objective
Reduce the opposing player's Health from 20 to 0. A battle against the CPU is available in the standalone prototype.

## Deck building
- Exactly 16 cards per deck.
- At most two copies of any card.
- Eight original hero cards are currently available.
- The starter deck contains two copies of each hero.

## Starting a battle
Both players shuffle their decks and draw three cards. The first player draws a fourth card at the start of their first turn. Players can hold at most seven cards.

## Turn sequence
1. Gain energy equal to the current round plus one, capped at six.
2. Draw one card if the deck has cards and the hand has room.
3. Deploy heroes from hand, paying their energy costs. Each player may control up to three heroes.
4. End turn to attack automatically with all of your deployed heroes, from left to right.
5. The CPU then takes its turn.

## Combat
Each attacking hero deals its **Power** as damage. Damage first hits opposing heroes, from left to right, reducing their remaining **Guard**. A hero is removed when its Guard reaches zero. Any excess damage carries through to the next defender; when no defenders remain, excess damage reduces the opponent's Health.

Deployed heroes remain on the field between turns, and damage to their Guard persists.

## Hero effects
- **Pulse**: immediately deals 1 damage to the opposing player's Health when deployed.
- **Shield**: gains +1 Guard when deployed.
- **Trick**: draws one card when deployed, if possible.

## Ending
The first player to reduce their opponent to zero Health wins. If both reach zero, the game is a draw. If the round limit is exceeded, the player with more Health wins, or the game draws if tied.

## Current prototype limitations
The CPU uses a simple first-affordable-card strategy. There is no multiplayer, matchmaking, accounts, purchases, coin rewards, server persistence, animations, or advanced targeting. Deck changes are stored only in your browser.

All rules are subject to balancing and testing before launch.
