//	temporary, allow this to be overriden
//	todo: rename Value to Rank
const DefaultDeck = 
{
	get Suits() 	{	return ['Club','Spade','Heart','Diamond'];	},
	get Values()	{	return [2,3,4,5,6,7,8,9,10,11,12,13,14];	},
	get WildSuit()	{	return '*';	},
	get WildValue()	{	return -1;	},
	get HighestValue()		{	return this.Values[this.Values.length-1];	},
	get ValuesDescending()	{	return DefaultDeck.Values.slice().sort(CompareDescending);	},
	
	//	todo: a more flexible system for two-value cards
	get AceIsHighAndLow()	{	return true;	},
	get Ace()				{	return 14;	},
};


function CompareAscending(a,b)
{
	return a - b;
}

function CompareDescending(a,b)
{
	return b-a;
}

function CompareCardsDescendingWildLast(a,b)
{
	a = a.Value;
	b = b.Value;
	if ( a == b )
		return 0;
	if ( a == DefaultDeck.WildValue )
		return 1;
	if ( b == DefaultDeck.WildValue )
		return -1;
	return b-a;
}

function IsSameSuit(a,b)
{
	a = (a instanceof Card) ? a.Suit : a;
	b = (b instanceof Card) ? b.Suit : b;
	if ( a == DefaultDeck.WildSuit || b == DefaultDeck.WildSuit )
		return true;
	return a == b;
}

function IsSameValue(a,b)
{
	a = (a instanceof Card) ? a.Value : a;
	b = (b instanceof Card) ? b.Value : b;

	if ( DefaultDeck.AceIsHighAndLow )
	{
		if ( a == DefaultDeck.Ace && b == 1 )
			return true;
		if ( b == DefaultDeck.Ace && a == 1 )
			return true;
	}
	
	if ( a == DefaultDeck.WildValue || b == DefaultDeck.WildValue )
		return true;
	
	return a == b;
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
	
	Equals(that)
	{
		return (this.Value == that.Value) && (this.Suit == that.Suit);
		//return IsSameValue(this,that) && IsSameSuit(this,that);
	}
	
}

export class Hand
{
	constructor(Cards,HandType,Score)
	{
		this.Cards = Cards.slice();
		this.Type = HandType;
		this.Score = Number(Score);
		
		if ( !Number.isInteger(this.Score) )
		{
			console.error(`Card Score ${Score} (${this.Score}) not integer`);
			//throw `Card score ${Score} (${this.Score}) not integer`;
		}
	}		
}



//	these functions probably want to go into some kind of deck container
export function GetJokerCards(Count=1)
{
	const Cards = [];
	for ( let i=0;	i<Count;	i++ )
	{
		const card = new Card(DefaultDeck.WildSuit,DefaultDeck.WildValue);
		Cards.push(card);
	}
	return Cards;
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



//	todo: wild first as highest card
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

//	this is expecting all the cards to be found
//	and does NOT use wilds
function PopMatchingCards(Cards,MatchCards)
{
	const Popped = [];
	//	all matching cards must be found, so
	//	iterate through them
	for ( let m=0;	m<MatchCards.length;	m++ )
	{
		const MatchCard = MatchCards[m];
		const CardIndex = Cards.findIndex( c => c.Equals(MatchCard) );
		if ( CardIndex < 0 )
			throw `Matching card ${JSON.stringify(MatchCard)} not found`;
		Popped.push( ...Cards.splice(CardIndex,1) );
	}
	return Popped;
}

function PopNCardsWithValue(Cards,Value,MinimumPopped,MaxiumumPopped)
{
	const Matches = Cards.filter( c => IsSameValue(c,Value) );
	if ( Matches.length < MinimumPopped )
		return false;

	//	try and pop wild cards last, so we dont accidentally
	//	use a wildcard instead of a 7
	//	then when we need a wild card, we have a 7 but not a 5
	Cards.sort(CompareCardsDescendingWildLast);
	//	but then, we need to iterate backwards when splicing
	//	so, reverse
	Cards = Cards.reverse();
	
	const Popped = [];
	for ( let i=Cards.length-1;	i>=0;	i-- )
	{
		let Card = Cards[i];
		if ( !IsSameValue(Card,Value) )
			continue;
		if ( Popped.length >= MaxiumumPopped )
			break;
		Popped.push( ...Cards.splice(i,1) );
	}
	return Popped;
}

function GetNCardsWithValue(Cards,Value,Limit)
{
	const VCards = Cards.filter( c => IsSameValue(c,Value) );
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
	//const Suits = new Set( Cards.map(c=>c.Suit) );
	const Suits = Cards.map(c=>c.Suit);
	for ( let Suit of Suits )
	{
		//	need to ignore matching wild suits here
		if ( Suit == DefaultDeck.WildSuit )
			continue;
		
		const SuitedCards = GetStraightHandOfSuit( c => IsSameSuit(c,Suit) );
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
	function FindStraightStartingWithValue(Value)
	{
		//	wild cards mean we can't just grab sorted chunks any more
		const TestCards = Cards.slice();
		const PoppedCards = [];
		for ( let v=Value;	v>=0;	v-- )
		{
			const Popped = PopNCardsWithValue(TestCards,v,1,1);
			
			//	required next card missing
			if ( !Popped )
				return false;
			
			PoppedCards.push(...Popped);
			//	remove to make unlimited straight
			if ( PoppedCards.length == StraightLength )
				break;
		}
		//	didn't make a straight
		if ( PoppedCards.length < StraightLength )
			return false;
		
		return PoppedCards;
		//return GetSortedFiveCards(StraightCards);
	}
	
	const Values = Cards.map( GetCardValue );
	
	//	remove duplicates
	let UniqueValues = [...new Set(Values)];
	const WildCardCount = Values.filter( v => v==DefaultDeck.WildValue ).length;
	
	//	UniqueValues includes 1 wild card. Additional wildcards can count as other values
	const AdditionalUniqueValues = Math.max(0,WildCardCount-1);
	if ( UniqueValues.length+AdditionalUniqueValues < StraightLength )
		return false;
	UniqueValues = Values.sort(CompareDescending);
	
	//	if we have at least one wild card, we need to try a straight
	//	with every rank going down... we don't even need to check the rest
	if ( WildCardCount > 0 )
		UniqueValues = DefaultDeck.ValuesDescending;
	
	//	for each number, count up N in a row
	for ( let i=0;	i<UniqueValues.length;	i++ )
	{
		const Value = UniqueValues[i];
		const Straight = FindStraightStartingWithValue(Value);
		if ( !Straight )
			continue;
		return Straight;
	}
	return false;
}


function GetFullHouseHand(AllCards)
{
	const RemainingCards = AllCards.slice();

	//	pop trips first
	const AllTrips = GetAllMeldsInHand(RemainingCards,3);
	if ( AllTrips.length < 1 )
		return false;
	
	const BestTrips = AllTrips[0];
	const Trips = PopMatchingCards(RemainingCards,BestTrips);
	
	//	now pop best pair
	const AllPairs = GetAllMeldsInHand(RemainingCards,2);
	if ( AllPairs.length < 1 )
		return false;
	
	const BestPair = AllPairs[0];
	const Pair = PopMatchingCards(RemainingCards,BestPair);
	
	const FullHouseCards = Trips.concat( Pair );
	return GetSortedFiveCards( FullHouseCards );
}

function GetFiveOfAKindHand(Cards)
{
	const Quints = GetAllMeldsInHand(Cards,5);
	if ( Quints.length < 1 )
		return false;
	
	return Quints[0];
}

function GetFourOfAKindHand(Cards)
{
	const Quads = GetAllMeldsInHand(Cards,4);
	if ( Quads.length < 1 )
		return false;
	
	return Quads[0];
}


function GetThreeOfAKindHand(Cards)
{
	const Trips = GetAllMeldsInHand(Cards,3);
	if ( Trips.length < 1 )
		return false;
	
	return Trips[0];
}


function GetAllMeldsInHand(AllCards,MeldSize)
{
	const Values = AllCards.map( GetCardValue ).sort( CompareDescending );
	const UniqueValues = new Set(Values);
	
	//	to make this work with wild cards easily
	//	pop pairs from the card list until we run out
	let RemainingCards = AllCards.slice();
	const Pairs = [];
	for ( let v of UniqueValues )
	{
		//	if we test wild against everything, we'll get spurious matches
		//	*==*, *==3, *==4, *==5 etc
		//	so treat wild card as highest rank, which will then make multiple wildcards work
		//	then A==*, A!==4, A!==5
		if ( v == DefaultDeck.WildValue )
			v = DefaultDeck.HighestValue;
		
		const Pair = PopNCardsWithValue(RemainingCards,v,MeldSize,MeldSize);
		if ( !Pair )
			continue;
		Pairs.push(Pair);
	}
	
	return Pairs;
}	



function GetTwoPairHand(Cards)
{
	const Pairs = GetAllMeldsInHand(Cards,2);
	if ( Pairs.length < 2 )
		return false;

	const AllCards = Pairs[0].concat(Pairs[1]);
	return AllCards;
}

function GetOnePairHand(Cards)
{
	const Pairs = GetAllMeldsInHand(Cards,2);
	if ( Pairs.length < 1 )
		return false;
	
	const AllCards = Pairs[0];
	return AllCards;
}

function GetHighCardHand(Cards)
{
	if ( Cards.length == 0 )
		return false;
	const Values = Cards.map( GetCardValue ).sort( CompareDescending );
	const FirstHighest = Cards.find( c => IsSameValue( c, Values[0] ) );
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
		`Five Of A Kind`,
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
		GetFiveOfAKindHand,
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
		return new Hand( [], HandTypes.slice(-1)[0], 0 );

	for ( let f=0;	f<GetHandFuncs.length;	f++ )
	{
		const GetHandFunc = GetHandFuncs[f];
		const HandCards = GetHandFunc( Cards );
		if ( HandCards === false )
			continue;
		const HandType = HandTypes[f];
		const Score = 1;
		return new Hand( HandCards, HandType, Score );
	}
	
	throw "Shouldn't reach here, GetScoringHand should always give a result";
}
