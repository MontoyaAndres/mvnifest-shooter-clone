const currentDate = new Date().toJSON();

const getEventOperation = async (id, sectionId, subId, session) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION) - [:CREATES_EVENT] -> (event:EVENT)
      WHERE user.subId = $subId AND ID(section) = $sectionId AND ID(event) = $eventId
      RETURN event
      `,
      {
        subId,
        sectionId: parseInt(sectionId, 10),
        eventId: parseInt(id, 10),
      }
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

const listEventsOperation = async (sectionId, subId, session) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION) - [:CREATES_EVENT] -> (events:EVENT)
      WHERE user.subId = $subId AND ID(section) = $sectionId
      RETURN events
      ORDER BY events.createdAt DESC
      `,
      {
        subId,
        sectionId: parseInt(sectionId, 10),
      }
    );

    const records =
      result.records.map((record) => {
        let currentRecord = record.get(0);

        return {
          ...currentRecord.properties,
          id: currentRecord.identity.low,
        };
      }) || [];

    return records;
  } catch (error) {
    throw new Error(error);
  }
};

const createEventOperation = async (input, subId, session) => {
  try {
    const getSection = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION)
      WHERE user.subId = $subId AND ID(section) = $sectionId
      RETURN section
      `,
      { subId, sectionId: parseInt(input.sectionId, 10) }
    );

    const sectionRecords = getSection.records;

    if (sectionRecords.length === 0) {
      throw new Error("Section not found.");
    }

    const createEvent = await session.run(
      `
      MATCH (section:SECTION)
      WHERE ID(section) = $sectionId
      CREATE (section) - [:CREATES_EVENT] -> (event:EVENT {
        dateStart: $eventDateStart,
        dateEnd: $eventDateEnd,
        name: $eventName,
        description: $eventDescription,
        image: $eventImage,
        ticketsAvailable: $eventTicketsAvailable,
        location: $eventLocation,
        createdAt: $eventCreatedAt,
        updatedAt: $eventUpdatedAt
      })
      RETURN event
    `,
      {
        sectionId: parseInt(input.sectionId, 10),
        eventDateStart: input.dateStart,
        eventDateEnd: input.dateEnd,
        eventName: input.name,
        eventDescription: input.description,
        eventImage: input.image,
        eventTicketsAvailable: parseInt(input.ticketsAvailable, 10),
        eventLocation: input.location,
        eventCreatedAt: currentDate,
        eventUpdatedAt: currentDate,
      }
    );

    return createEvent.records;
  } catch (error) {
    throw new Error(error);
  }
};

const updateEventOperation = async (input, subId, session) => {
  try {
    const getSection = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION)
      WHERE user.subId = $subId AND ID(section) = $sectionId
      RETURN section
      `,
      { subId, sectionId: parseInt(input.sectionId, 10) }
    );

    const sectionRecords = getSection.records;

    if (sectionRecords.length === 0) {
      throw new Error("Section not found.");
    }

    const updateEvent = await session.run(
      `
      MATCH (event:EVENT)
      WHERE ID(event) = $eventId
      SET
        ${input.dateStart ? "event.dateStart = $eventDateStart," : ""}
        ${input.dateEnd ? "event.dateEnd = $eventDateEnd," : ""}
        ${input.name ? "event.name = $eventName," : ""}
        ${input.description ? "event.description = $eventDescription," : ""}
        ${input.image ? "event.image = $eventImage," : ""}
        ${
          input.ticketsAvailable
            ? "event.ticketsAvailable = $eventTicketsAvailable,"
            : ""
        }
        ${input.location ? "event.location = $eventLocation," : ""}
      event.updatedAt = $eventUpdatedAt
      RETURN event
    `,
      {
        eventId: parseInt(input.id, 10),
        eventDateStart: input.dateStart,
        eventDateEnd: input.dateEnd,
        eventName: input.name,
        eventDescription: input.description,
        eventImage: input.image,
        eventTicketsAvailable: parseInt(input.ticketsAvailable, 10),
        eventLocation: input.location,
        eventUpdatedAt: currentDate,
      }
    );

    return updateEvent.records;
  } catch (error) {
    throw new Error(error);
  }
};

const deleteEventOperation = async (input, subId, session) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER {subId: $subId}) - [:OWNS] -> (section:SECTION)
      WHERE ID(section) = $sectionId
      MATCH (section) - [:CREATES_EVENT] -> (event:EVENT)
      WHERE ID(event) = $eventId
      DETACH DELETE event
      `,
      {
        subId,
        sectionId: parseInt(input.sectionId, 10),
        eventId: parseInt(input.id, 10),
      }
    );

    return result.records;
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  getEventOperation,
  listEventsOperation,
  createEventOperation,
  updateEventOperation,
  deleteEventOperation,
};
