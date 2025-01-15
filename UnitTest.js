import * as Poker from './Poker.js'


function ExpectABeatB(CardsA,CardsB,CardsShared=[])
{
	if ( typeof CardsA == typeof '' )
		CardsA = CardsStringToCards(CardsA);
	if ( typeof CardsB == typeof '' )
		CardsB = CardsStringToCards(CardsB);
	
	const HandA = Poker.GetScoringHand( CardsA.concat( CardsShared ) );
	const HandB = Poker.GetScoringHand( CardsB.concat( CardsShared ) );
	const ScoreA = HandA.Score;
	const ScoreB = HandB.Score;
	
	if ( ScoreA > ScoreB )
	{
		console.log(`CardsA (${HandA.Type} ${HandA.Score}) beats CardsB (${HandB.Type} ${HandB.Score})`);
		return;
	}
	
	throw `CardsA(score=${ScoreA}) expected to beat CardsB(score=${ScoreB})`;
}


//	turn C2 into Card(Club,2)
function CardsStringToCards(CardString)
{
	function GetSuitName(char)
	{
		char = char.toUpperCase();
		const MatchingSuit = Poker.DefaultDeck.Suits.find( s => s.charAt(0) == char );
		if ( !MatchingSuit )
			throw `Unknown suit for ${char}`;
		return MatchingSuit;
	}
	
	function GetRank(char)
	{
		char = char.toUpperCase();
		const Int = Number(char);
		if ( Number.isInteger(Int) )
			return Int;
		
		switch(char.toUpperCase())
		{
			case 'A':	return Poker.DefaultDeck.RankAce;
			case 'K':	return Poker.DefaultDeck.RankKing;
			case 'Q':	return Poker.DefaultDeck.RankQueen;
			case 'J':	return Poker.DefaultDeck.RankJack;
			case 'T':	return Poker.DefaultDeck.RankTen;
		}
		throw `Unknown rank from ${char}`;
	}
	
	const Cards = [];
	for ( let i=0;	i<CardString.length;	i+=2 )
	{
		const [RankChar,SuitChar] = CardString.substr( i, 2 ).split('');
		const Rank = GetRank(RankChar); 
		const Suit = GetSuitName(SuitChar);
		const Card = new Poker.Card( Suit, Rank );
		Cards.push(Card);
	}
	return Cards;
}

ExpectABeatB("Ac","Kh");
ExpectABeatB("KcKh","Ah");

//	kickers
//ExpectABeatB("KcKh7h","KsKd5s");
