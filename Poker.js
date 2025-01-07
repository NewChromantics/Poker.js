//	temporary, allow this to be overriden
const DefaultDeck = 
{
	Suits: ['Club','Spade','Heart','Diamond'],
	Values: [2,3,4,5,6,7,8,9,10,11,12,13,14]
};


function CompareAscending(a,b)
{
	return a - b;
}

function CompareDescending(a,b)
{
	return b-a;
}

export class Card
{
	constructor(Suit,Value)
	{
		this.Suit = Suit;
		this.Value = Number(Value);
		if ( !Number.isInteger(this.Value) )
		{
			console.error(`Card value ${Value} (${this.Value}) not integer`);
			//throw `Card value ${Value} (${this.Value}) not integer`;
		}
	}
}

export class Hand
{
	constructor(Cards,HandType)
	{
		this.Cards = Cards.slice();
		this.Type = HandType;
	}		
}

//	these functions probably want to go into some kind of deck container
export function GetAllCards()
{
	const Cards = [];
	for ( let Suit of DefaultDeck.Suits )
	{
		for ( let Value of DefaultDeck.Values )
		{
			const card = new Card(Suit,Value);
			Cards.push(card);
		}
	}
	return Cards;
}


function GetSortedFiveCards(Cards)
{
	function Compare(a,b)
	{
		const va = GetCardValue(a);
		const vb = GetCardValue(b);
		if ( va > vb )	return -1;
		if ( va < vb )	return 1;
		return 0;
	}
	Cards.sort( Compare );
	Cards.length = Math.min( 5, Cards.length );
	return Cards;
}

function GetNCardsWithValue(Cards,Value,Limit)
{
	const VCards = Cards.filter( c => GetCardValue(c) == Value );
	VCards.length = Math.min( Limit, VCards.length );
	return VCards;
}

//	deprecated
function GetCardValue(Card)
{
	return Card.Value;
}

//	deprecated
function GetCardSuit(Card)
{
	return Card.Suit;
}

function GetCardToString(Card)
{
	const Suit = GetCardSuit(Card);
	const SuitName = PlayingCards.SuitNames[Suit];
	const CardValue = GetCardValue(Card);
	let CardName = PlayingCards.CardNames[CardValue];
	if ( !CardName )
		CardName = CardValue;
	
	return SuitName + CardName;
}

function GetHandToString(Cards)
{
	const Names = Cards.map( GetCardToString );
	return Names.join(', ');
}

//	return the best straight+flush hand (5)
function GetStraightFlushHand(Cards)
{
	function GetStraightHandOfSuit(IsSuitFunc)
	{
		const Hearts = Cards.filter( c => IsSuitFunc(c) );
		if ( Hearts.length < 5 )
			return false;
		
		const StraightHand = GetStraightHand(Hearts);
		return StraightHand;
	}
	
	//	enum suits
	const Suits = new Set( Cards.map(c=>c.Suit) );
	for ( let Suit of Suits )
	{
		const SuitedCards = GetStraightHandOfSuit( c => c.Suit == Suit );
		if ( !SuitedCards )
			continue;
		return SuitedCards;
	}
	return false;
}


//	return the best flush (5)
function GetFlushHand(Cards)
{
	//	enum suits
	const Suits = new Set( Cards.map(c=>c.Suit) );
	for ( let Suit of Suits )
	{
		const SuitedCards = Cards.filter( c => c.Suit==Suit );
		if ( SuitedCards.length >= 5 )
			return GetSortedFiveCards(SuitedCards);
	}
	return false;
}

function IsDescendingSequence(Array)
{
	for ( let i=1;	i<Array.length;	i++ )
		if ( Array[i-1] != Array[i]+1 )
			return false;
	return true;
}

//	return the best straight hand
//	todo: properly handle 6 card straight etc
function GetStraightHand(Cards,StraightLength=5)
{
	const Values = Cards.map( GetCardValue );
	
	//	remove duplicates
	let UniqueValues = [...new Set(Values)];
	if ( UniqueValues.length < StraightLength )
		return false;
	UniqueValues = Values.sort(CompareDescending);
	
	//	for each number, count up N in a row
	for ( let i=0;	i<UniqueValues.length;	i++ )
	{
		let Set = UniqueValues.slice( i, StraightLength );
		if ( Set.length != StraightLength )	
			continue;
		if ( !IsDescendingSequence(Set) )
			continue;
		
		//	grab cards from original bunch that match this set
		function GetStraightCard(CardValue)
		{
			function MatchCardValue(Card)
			{
				return GetCardValue(Card) == CardValue;
			}
			const Card = Cards.find( MatchCardValue );
			if ( Card === undefined )	throw "Failed to match this card in original bunch";
			return Card;
		}
		const StraightCards = Set.map( GetStraightCard );
		return GetSortedFiveCards(StraightCards);
	}
	return false;
}


function GetFullHouseHand(Cards)
{
	//	for any 5, is there 3 & 2...
	//	todo: expand to N & N-1
	const Threes = [];
	const Pairs = [];
	const Values = Cards.map( GetCardValue );
	for ( let v of Values )
	{
		const MatchingValues = Values.filter( c => c==v );
		if ( MatchingValues.length >= 3 )
			Threes.push( v );
		if ( MatchingValues.length == 2 )
			Pairs.push( v );
	}
	if ( Threes.length == 0 || Pairs.length == 0 )
		return false;
	if ( Threes.length > 1 )
		Threes.sort(CompareDescending);
	if ( Pairs.length > 1 )
		Pairs.sort(CompareDescending);
	
	//	pick any 3 cards matching Threes[0]
	//	pick any 2 cards matching Pairs[0]
	const ThreeCards = GetNCardsWithValue( Cards, Threes[0], 3 );
	const PairCards = GetNCardsWithValue( Cards, Pairs[0], 2 );
	
	const FullHouseCards = ThreeCards.concat( PairCards );
	return GetSortedFiveCards( FullHouseCards );
}

function GetFourOfAKindHand(Cards)
{
	const Values = Cards.map( GetCardValue ).sort( CompareDescending );
	for ( let v of Values )
	{
		const MatchingValues = Values.filter( c => c==v );
		if ( MatchingValues.length > 4 )
			throw "Invalid case, >4 four of a kind";
		if ( MatchingValues.length < 4 )
			continue;
		
		//	grab 4 cards with this value
		const Hand = GetNCardsWithValue( Cards, v, 4 );
		return Hand;
	}
	return false;
}


function GetThreeOfAKindHand(Cards)
{
	const Values = Cards.map( GetCardValue ).sort( CompareDescending );
	for ( let v of Values )
	{
		const MatchingValues = Values.filter( c => c==v );
		if ( MatchingValues.length < 3 )
			continue;
		
		//	grab 3 cards with this value
		const Hand = GetNCardsWithValue( Cards, v, 3 );
		return Hand;
	}
	return false;
}

//	todo: expand to allow 2 pair, 3 pair, 4 pair etc 
function GetTwoPairHand(Cards)
{
	let PairHi = null;
	let PairLo = null;
	const Values = Cards.map( GetCardValue ).sort( CompareDescending );
	const UniqueValues = new Set(Values);
	for ( let v of UniqueValues )
	{
		const MatchingValues = Values.filter( c => c==v );
		if ( MatchingValues.length < 2 )
			continue;
		if ( PairHi === null )
		{
			PairHi = v;
			continue;
		}
		if ( PairLo === null )
		{
			PairLo = v;
			break;
		}
	}
	if ( PairLo === null )
		return false;
	
	const HandHi = GetNCardsWithValue( Cards, PairHi, 2 );
	const HandLo = GetNCardsWithValue( Cards, PairLo, 2 );
	return HandHi.concat( HandLo );
}

function GetOnePairHand(Cards)
{
	const Pairs = [];
	const Values = Cards.map( GetCardValue ).sort( CompareDescending );
	for ( let v of Values )
	{
		const MatchingValues = Values.filter( c => c==v );
		if ( MatchingValues.length >= 2 )
			Pairs.push( v );
	}
	if ( Pairs.length == 0 )
		return false;
	
	//	get pairs with highest value
	//	now grab any card from the best pair set
	if ( Pairs.length > 1 )
		Pairs.sort(CompareDescending);
	const Hand = GetNCardsWithValue( Cards, Pairs[0], 2 );
	return Hand;
}

function GetHighCardHand(Cards)
{
	if ( Cards.length == 0 )
		return false;
	const Values = Cards.map( GetCardValue ).sort( CompareDescending );
	const FirstHighest = Cards.find( c => c.Value == Values[0] );
	return [FirstHighest];
}

/*
function GetHandScore(Cards)
{
	//	X000 + HighV gives a unique value
	function GetScore(GetHandFunc,FuncScore)
	{
		const Hand = GetHandFunc( Cards );
		if ( Hand === false )
			return 0;
		let Score = FuncScore * 1000;
		const HighCardValue = GetCardValue(Hand[0]);
		Score += HighCardValue;
		return Score;
	}
	const GetHandFuncs =
	[
		GetStraightFlushHand,
		GetFourOfAKindHand,
		GetFullHouseHand,
		GetFlushHand,
		GetStraightHand,
		GetThreeOfAKindHand,
		GetTwoPairHand,
		GetOnePairHand,
		GetHighCardHand
	];
	for ( let f=0;	f<GetHandFuncs.length;	f++ )
	{
		const FuncScore = GetHandFuncs.length - f;
		const Score = GetScore( GetHandFuncs[f], FuncScore );
		if ( Score != 0 )
			return Score;
	}
	throw "Shouldn't reach here";
}


function CompareBestHands(PlayerA,PlayerB)
{
	//	need to re-classify these hands, oops. maybe need a score/id for type
	const ScoreA = GetHandScore( PlayerA.BestHand );
	const ScoreB = GetHandScore( PlayerB.BestHand );
	if ( ScoreA > ScoreB )
		return -1;
	if ( ScoreB > ScoreA )
		return 1;
	return 0;
}

function CompareHands(PlayerA,PlayerB)
{
	function Compare(CardFunc)
	{
		const a = CardFunc(PlayerA.Cards);
		const b = CardFunc(PlayerB.Cards);
		if ( a!==false && b===false )
			return -1;
		if ( a===false && b!==false )
			return 1;
		if ( a!==false && b!==false )
		{
			const HighA = GetCardValue(a[0]);
			const HighB = GetCardValue(b[0]);
			if ( HighA > HighB )
				return -1;
			if ( HighB > HighA )
				return 1;
		}
		//	tie
		return 0;
	}
	
	const StraightFlush = Compare( GetStraightFlushHand );
	if ( StraightFlush != 0 )
		return StraightFlush;
	
	const Four = Compare( GetFourOfAKindHand );
	if ( Four != 0 )
		return Four;
	
	const FullHouse = Compare( GetFullHouseHand );
	if ( FullHouse != 0 )
		return FullHouse;
	
	const Flush = Compare( GetFlushHand );
	if ( Flush != 0 )
		return Flush;
	
	const Straight = Compare( GetStraightHand );
	if ( Straight != 0 )
		return Straight;
	
	const Three = Compare( GetThreeOfAKindHand );
	if ( Three != 0 )
		return Three;
	
	const Pair2 = Compare( GetTwoPairHand );
	if ( Pair2 != 0 )
		return Pair2;
	
	const Pair = Compare( GetOnePairHand );
	if ( Pair != 0 )
		return Pair;
	
	const High = Compare( GetHighCardHand );
	if ( High != 0 )
		return High;
	
	return 0;
}
*/


export function GetScoringHand(Cards)
{
	const HandTypes =
	[
		`Straight Flush`,
		`Four Of A Kind`,
		`Full House`,
		`Flush`,
		`Straight`,
		`Three Of A Kind`,
		`Two pair`,
		`One Pair`,
		`High Card`,
		`No Cards`
	];
	const GetHandFuncs =
	[
		GetStraightFlushHand,
		GetFourOfAKindHand,
		GetFullHouseHand,
		GetFlushHand,
		GetStraightHand,
		GetThreeOfAKindHand,
		GetTwoPairHand,
		GetOnePairHand,
		GetHighCardHand
	];
	
	if ( Cards.length == 0 )
		return new Hand( [], HandTypes.slice(-1)[0] );

	for ( let f=0;	f<GetHandFuncs.length;	f++ )
	{
		const GetHandFunc = GetHandFuncs[f];
		const HandCards = GetHandFunc( Cards );
		if ( HandCards === false )
			continue;
		const HandType = HandTypes[f];
		return new Hand( HandCards, HandType );
	}
	
	throw "Shouldn't reach here, GetScoringHand should always give a result";
}
