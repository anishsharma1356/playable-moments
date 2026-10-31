// Generated from content.json by the offline authoring tool.
window.ChessDemo.setContent({
  "version": 1,
  "title": "Would you offer your queen?",
  "question": "You are playing White. Which queen move would you try?",
  "optionA": "Offer the queen: Qb8+",
  "optionB": "Keep the queen: Qb5",
  "creatorChoice": null,
  "resolvedAnswer": null,
  "historicalMove": "16. Qb8+",
  "outcomeSummary": "In this independent reconstruction, Morphy plays Qb8+. After the knight captures on b8, the d-file is clear for Rd8 checkmate. The bishop on g5 protects d8 and covers e7. The lesson: examine piece coordination, not only material. The creator choice shown separately is Anish's session prediction, not Morphy's vote.",
  "disclosure": "Independent chess reconstruction · Not original broadcast footage",
  "credit": "Paul Morphy vs Duke of Brunswick & Count Isouard · Paris, 1858",
  "states": {
    "setup": "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16",
    "queen": "1Q2kb1r/p2n1ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 b k - 1 16",
    "knight": "1n2kb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 w k - 0 17",
    "mate": "1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17"
  },
  "cues": [
    {
      "id": "setup-1",
      "part": "setup",
      "state": "setup",
      "minimumSeconds": 3,
      "speech": "You are playing White.",
      "caption": "You are playing White."
    },
    {
      "id": "setup-2",
      "part": "setup",
      "state": "setup",
      "minimumSeconds": 6,
      "speech": "Would you offer your queen on b8, or keep it on b5?",
      "caption": "Would you offer your queen on b8,\nor keep it on b5?"
    },
    {
      "id": "setup-3",
      "part": "setup",
      "state": "setup",
      "minimumSeconds": 5,
      "speech": "Choose A or B before the historical move is revealed.",
      "caption": "Choose A or B before the historical move is revealed."
    },
    {
      "id": "reveal-1",
      "part": "reveal",
      "state": "queen",
      "minimumSeconds": 4.5,
      "speech": "Morphy played queen to b8, with check.",
      "caption": "Morphy played queen to b8, with check."
    },
    {
      "id": "reveal-2",
      "part": "reveal",
      "state": "knight",
      "minimumSeconds": 5,
      "speech": "The knight captured the queen, clearing the d file.",
      "caption": "The knight captured the queen,\nclearing the d-file."
    },
    {
      "id": "reveal-3",
      "part": "reveal",
      "state": "mate",
      "minimumSeconds": 4,
      "speech": "Rook to d8 was checkmate.",
      "caption": "Rook to d8 was checkmate."
    },
    {
      "id": "reveal-4",
      "part": "reveal",
      "state": "mate",
      "minimumSeconds": 6,
      "speech": "The bishop protects d8 and covers the king's escape on e7.",
      "caption": "The bishop protects d8\nand covers the king's escape on e7."
    },
    {
      "id": "reveal-5",
      "part": "reveal",
      "state": "mate",
      "minimumSeconds": 6,
      "speech": "A queen was lost, but the coordinated pieces won. Look beyond material.",
      "caption": "A queen was lost, but the coordinated pieces won.\nLook beyond material."
    }
  ],
  "setupTranscript": "Independent chess reconstruction, not original broadcast footage. White is at the bottom and it is White's turn before move 16. White: king c1, queen b3, rook d1, bishop g5, pawns a2 b2 c2 e4 f2 g2 h2. Black: king e8, queen e6, rook h8, bishop f8, knight d7, pawns a7 e5 f7 g7 h7. A: offer the queen with Qb8+. B: keep the queen with Qb5. Both are legal options. No historical move or result is shown in setup.",
  "revealTranscript": "Independent reconstruction of Paul Morphy against the Duke of Brunswick and Count Isouard, Paris 1858. Morphy moves the white queen from b3 to b8 with check. The black knight moves from d7 to b8 and captures it. The white rook moves from d1 to d8: checkmate. The vacated d7 square clears the rook's file. The bishop on g5 protects d8 along f6 and e7, and covers the king's e7 escape. The narration explains piece coordination rather than only material value. No Twitch votes or Anish prediction were recorded in this preparation video."
});
