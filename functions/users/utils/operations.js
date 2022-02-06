const getUserOperation = async (userId, session) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER)
      WHERE user.subId = $userId
      RETURN user
      `,
      { userId }
    );

    const record = result.records[0];
    const node = record.get(0);

    return {
      ...node.properties,
      id: node.identity.low,
    };
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { getUserOperation };
