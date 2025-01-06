

const Suits = ['Club','Spade','Heart','Diamond'];
const Values = [2,3,4,5,6,7,8,9,10,11,12,13,14];

class Card
{
	constructor(Suit,Value)
	{
		this.Suit = Suit;
		this.Value = Value;
	}
}

//	these functions probably want to go into some kind of deck container
export function GetAllCards()
{
	const Cards = [];
	for ( let Suit of Suits )
	{
		for ( let Value of Values )
		{
			const card = new Card(Suit,Value);
			Cards.push(card);
		}
	}
	return Cards;
}

