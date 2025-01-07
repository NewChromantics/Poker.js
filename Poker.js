//	temporary, allow this to be overriden
const DefaultDeck = 
{
	get Suits() 	{	return ['Club','Spade','Heart','Diamond'];	},
	get Ranks()	{	return [2,3,4,5,6,7,8,9,10,11,12,13,14];	},
	get WildSuit()	{	return '*';	},
	get WildRank()	{	return -1;	},
	get HighestRank()		{	return this.Ranks[this.Ranks.length-1];	},
	get RanksDescending()	{	return DefaultDeck.Ranks.slice().sort(CompareDescending);	},
	
	//	todo: a more flexible system for two-Rank cards
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
	a = a.Rank;
	b = b.Rank;
	if ( a == b )
		return 0;
	if ( a == DefaultDeck.WildRank )
		return 1;
	if ( b == DefaultDeck.WildRank )
		return -1;
	return b-a;
}

function GetHighestRankInCards(Cards)
{
	const Ranks = Cards.map( c => c.ScoreCard.Rank );
	Ranks.sort(CompareDescending);
	return Ranks[0];
}

function IsSameSuit(a,b)
{
	a = (a instanceof Card) ? a.Suit : a;
	b = (b instanceof Card) ? b.Suit : b;
	if ( a == DefaultDeck.WildSuit || b == DefaultDeck.WildSuit )
		return true;
	return a == b;
}

function IsSameRank(a,b)
{
	a = (a instanceof Card) ? a.Rank : a;
	b = (b instanceof Card) ? b.Rank : b;

	if ( DefaultDeck.AceIsHighAndLow )
	{
		if ( a == DefaultDeck.Ace && b == 1 )
			return true;
		if ( b == DefaultDeck.Ace && a == 1 )
			return true;
	}
	
	if ( a == DefaultDeck.WildRank || b == DefaultDeck.WildRank )
		return true;
	
	return a == b;
}

export class Card
{
	constructor(Suit,Rank,OriginalCard)
	{
		this.Suit = Suit;
		this.Rank = Number(Rank);

		if ( !Number.isInteger(this.Rank) )
		{
			console.error(`Card Rank ${Rank} (${this.Rank}) not integer`);
			//throw `Card Rank ${Rank} (${this.Rank}) not integer`;
		}
	}
	
	get SuitOrWildNull()
	{
		return this.Suit == DefaultDeck.WildSuit ? null : this.Suit;
	}

	get RankOrWildNull()
	{
		return this.Rank == DefaultDeck.WildRank ? null : this.Rank;
	}

	get IsWild()
	{
		return !this.SuitOrWildNull || !this.RankOrWildNull;
	}
	
	get ScoreCard()
	{
		return this.RepresentCard ?? this;
	}
	
	Equals(that)
	{
		return (this.Rank == that.Rank) && (this.Suit == that.Suit);
		//return IsSameRank(this,that) && IsSameSuit(this,that);
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
		const card = new Card(DefaultDeck.WildSuit,DefaultDeck.WildRank);
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
		for ( let Rank of DefaultDeck.Ranks )
		{
			const card = new Card(Suit,Rank);
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
		const va = GetCardRank(a);
		const vb = GetCardRank(b);
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
		const PoppedCard = Cards.splice(CardIndex,1)[0]; 
		Popped.push( PoppedCard );
	}
	return Popped;
}

function PopNCardsWithRank(Cards,Rank,MinimumPopped,MaxiumumPopped)
{
	const Matches = Cards.filter( c => IsSameRank(c,Rank) );
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
		let MatchCard = Cards[i];
		if ( !IsSameRank(MatchCard,Rank) )
			continue;
		if ( Popped.length >= MaxiumumPopped )
			break;
		const PoppedCard = Cards.splice(i,1)[0];
		
		//	if the card that matched was wild, make it represent an equivelent card
		if ( MatchCard.IsWild )
		{
			const RepRank = MatchCard.RankOrWildNull ?? Rank;
			//	todo: get a suit that's unused in this meld
			const RepSuit = MatchCard.SuitOrWildNull ?? DefaultDeck.Suits[0]; 
			PoppedCard.RepresentCard = new Card( RepSuit, RepRank );
		}
		
		Popped.push( PoppedCard );
	}
	return Popped;
}


//	deprecated
function GetCardRank(Card)
{
	return Card.Rank;
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
		
		const StraightHand = GetStraightHand( Hearts.slice() );
		return StraightHand;
	}
	
	//	enum suits (into array so .length works)
	const Suits = [...new Set( Cards.map(c=>c.Suit) ) ];
	
	function GetStraightFlushForSuit(Suit)
	{
		//	need to ignore matching wild suits here
		if ( Suit == DefaultDeck.WildSuit )
		{
			//	unless there are ONLY wild suits!
			if ( Suits.length > 1 )
			{
				return false;
			}
		}
		
		const SuitedCards = GetStraightHandOfSuit( c => IsSameSuit(c,Suit) );
		if ( !SuitedCards )
			return false;
		
		return SuitedCards;
	}
	
	const StraightFlushes = [];
	for ( let Suit of Suits )
	{
		const StraightFlush = GetStraightFlushForSuit(Suit);
		if ( !StraightFlush )
			continue;
		StraightFlushes.push(StraightFlush);
	}
	
	if ( StraightFlushes.length == 0 )
		return false;
	
	function CompareCardSetDescending(aaa,bbb)
	{
		const a = GetHighestRankInCards(aaa);
		const b = GetHighestRankInCards(bbb);
		return b-a;
	}
	//	pick best ranked straight flush
	StraightFlushes.sort(CompareCardSetDescending);
	
	return StraightFlushes[0];
}


//	return the best flush (5)
function GetFlushHand(Cards)
{
	//	enum suits
	const Suits = [...new Set( Cards.map(c=>c.Suit) )];
	for ( let Suit of Suits )
	{
		//	need to ignore matching wild suits here
		if ( Suit == DefaultDeck.WildSuit )
		{
			//	unless there are ONLY wild suits!
			if ( Suits.length > 1 )
			{
				continue;
			}
		}
		
		const SuitedCards = Cards.slice().filter( c => IsSameSuit(c,Suit) );

		function IsCardNotAlreadyFound(Card)
		{
			return SuitedCards.find( c => c.Equals(Card) ) == null;
		}
		
		function AddRepresentedCard(MatchCard)
		{
			if ( MatchCard.IsWild )
			{
				//	todo: get a rank that doesnt then make a straight flush...
				//	gr: or is that not possible in practise, as the wild card would have already matched a straight flush...
				//	but we should avoid existing card
				let PossibleRepresents = DefaultDeck.RanksDescending.map( r => new Card(Suit,r) );
				PossibleRepresents = PossibleRepresents.filter(IsCardNotAlreadyFound);
				const RepCard = PossibleRepresents[0];
				MatchCard.RepresentCard = RepCard;
			}
		}
		
		SuitedCards.forEach( AddRepresentedCard );
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
	function FindStraightStartingWithRank(Rank)
	{
		//	wild cards mean we can't just grab sorted chunks any more
		const TestCards = Cards.slice();
		const PoppedCards = [];
		for ( let v=Rank;	v>=0;	v-- )
		{
			const Popped = PopNCardsWithRank(TestCards,v,1,1);
			
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
	
	const Ranks = Cards.map( GetCardRank );
	
	//	remove duplicates
	let UniqueRanks = [...new Set(Ranks)];
	const WildCardCount = Ranks.filter( v => v==DefaultDeck.WildRank ).length;
	
	//	UniqueRanks includes 1 wild card. Additional wildcards can count as other Ranks
	const AdditionalUniqueRanks = Math.max(0,WildCardCount-1);
	if ( UniqueRanks.length+AdditionalUniqueRanks < StraightLength )
		return false;
	UniqueRanks = Ranks.sort(CompareDescending);
	
	//	if we have at least one wild card, we need to try a straight
	//	with every rank going down... we don't even need to check the rest
	if ( WildCardCount > 0 )
		UniqueRanks = DefaultDeck.RanksDescending;
	
	//	for each number, count up N in a row
	for ( let i=0;	i<UniqueRanks.length;	i++ )
	{
		const Rank = UniqueRanks[i];
		const Straight = FindStraightStartingWithRank(Rank);
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
	const Ranks = AllCards.map( GetCardRank ).sort( CompareDescending );
	const UniqueRanks = new Set(Ranks);
	
	//	to make this work with wild cards easily
	//	pop pairs from the card list until we run out
	let RemainingCards = AllCards.slice();
	const Pairs = [];
	for ( let v of UniqueRanks )
	{
		//	if we test wild against everything, we'll get spurious matches
		//	*==*, *==3, *==4, *==5 etc
		//	so treat wild card as highest rank, which will then make multiple wildcards work
		//	then A==*, A!==4, A!==5
		if ( v == DefaultDeck.WildRank )
			v = DefaultDeck.HighestRank;
		
		const Pair = PopNCardsWithRank(RemainingCards,v,MeldSize,MeldSize);
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
	const Ranks = Cards.map( GetCardRank ).sort( CompareDescending );
	const FirstHighest = Cards.find( c => IsSameRank( c, Ranks[0] ) );
	
	if ( FirstHighest.IsWild )
	{
		const RepRank = DefaultDeck.HighestRank;
		const RepSuit = DefaultDeck.Suits[0];
		FirstHighest.RepresentCard = new Card(RepSuit,RepRank);
	}
	
	return [FirstHighest];
}



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
	//	best denominator you can get is 14*5
	//	thus each score jumps by this + 1?
	const MaxHandSize = 5;
	const Denom = (DefaultDeck.HighestRank * MaxHandSize) + 1;
	const HandBaseScores =
	[
		Denom*9,
		Denom*8,
		Denom*7,
		Denom*6,
		Denom*5,
		Denom*4,
		Denom*3,
		Denom*2,
		Denom*1,
		Denom*0,
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
		
		//	gr: this score also needs to include kickers
		//		we should probably modify all funcs to return N cards
		let Score = HandBaseScores[f];
		for ( let Card of HandCards )
			Score += Card.ScoreCard.Rank;
		
		return new Hand( HandCards, HandType, Score );
	}
	
	throw "Shouldn't reach here, GetScoringHand should always give a result";
}
