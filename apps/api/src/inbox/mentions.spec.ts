import { mentionedUserIds, type MentionableMember } from './mentions';

const alice: MentionableMember = {
  userId: 'alice',
  name: 'Alice Smith',
  email: 'asmith@example.com',
};

const bob: MentionableMember = {
  userId: 'bob',
  name: 'Bob Jones',
  email: 'bjones@example.com',
};

const aliceTwo: MentionableMember = {
  userId: 'alice-2',
  name: 'Alice Ng',
  email: 'ang@example.com',
};

describe('mentionedUserIds', () => {
  const members = [alice, bob];

  it('matches a full name', () => {
    expect(mentionedUserIds('hey @Alice Smith', members, 'bob')).toEqual([
      'alice',
    ]);
  });

  it('matches an unambiguous first name', () => {
    expect(mentionedUserIds('hey @Alice', members, 'bob')).toEqual(['alice']);
  });

  it('matches the email local part', () => {
    expect(mentionedUserIds('see @bjones', members, 'alice')).toEqual(['bob']);
  });

  it('does not use first name when two members share it', () => {
    const withCollision = [alice, aliceTwo, bob];
    expect(mentionedUserIds('hey @Alice', withCollision, 'bob')).toEqual([]);
    expect(
      mentionedUserIds('hey @Alice Smith', withCollision, 'bob'),
    ).toEqual(['alice']);
  });

  it('treats punctuation after the mention as a boundary', () => {
    expect(mentionedUserIds('hi @Alice.', members, 'bob')).toEqual(['alice']);
    expect(mentionedUserIds('hi @Alice!', members, 'bob')).toEqual(['alice']);
  });

  it('does not mention the actor', () => {
    expect(mentionedUserIds('@Alice Smith @Bob Jones', members, 'alice')).toEqual(
      ['bob'],
    );
  });

  it('returns nobody when the text has no mentions', () => {
    expect(mentionedUserIds('hello there', members, 'alice')).toEqual([]);
  });
});
