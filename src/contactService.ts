// import pool from "./database";
// import { Contact, IdentifyRequest, IdentifyResponse } from "./types";

// export class ContactService {
//   private mapRowToContact(row: any): Contact {
//     return {
//       id: row.id,
//       email: row.email,
//       phoneNumber: row.phoneNumber,
//       linkedId: row.linkedid,
//       linkPrecedence: row.linkprecedence,
//       createdAt: row.createdat,
//       updatedAt: row.updatedat,
//       deletedAt: row.deletedat,
//     };
//   }

//   async findContactsByEmailOrPhone(
//     email?: string,
//     phoneNumber?: string
//   ): Promise<Contact[]> {
//     const conditions: string[] = [];
//     const values: any[] = [];
//     let idx = 1;
//     if (email) {
//       conditions.push(`email = $${idx++}`);
//       values.push(email);
//     }
//     if (phoneNumber) {
//       conditions.push(`phonenumber = $${idx++}`);
//       values.push(phoneNumber);
//     }
//     if (!conditions.length) return [];

//     const query = `
//       SELECT
//         id,
//         email,
//         phonenumber AS "phoneNumber",
//         linkedid AS "linkedId",
//         linkprecedence AS "linkPrecedence",
//         createdat AS "createdAt",
//         updatedat AS "updatedAt",
//         deletedat AS "deletedAt"
//       FROM Contact
//       WHERE (${conditions.join(" OR ")}) AND deletedAt IS NULL
//       ORDER BY createdat ASC
//     `;

//     const result = await pool.query(query, values);
//     return result.rows.map(this.mapRowToContact);
//   }

//   async findAllLinkedContacts(primaryId: number): Promise<Contact[]> {
//     const query = `
//       SELECT
//         id,
//         email,
//         phonenumber AS "phoneNumber",
//         linkedid AS "linkedId",
//         linkprecedence AS "linkPrecedence",
//         createdat AS "createdAt",
//         updatedat AS "updatedAt",
//         deletedat AS "deletedAt"
//       FROM Contact
//       WHERE (id = $1 OR linkedid = $1) AND deletedAt IS NULL
//       ORDER BY createdat ASC
//     `;

//     const result = await pool.query(query, [primaryId]);
//     return result.rows.map(this.mapRowToContact);
//   }

//   async createContact(
//     email: string | null,
//     phoneNumber: string | null,
//     linkedId: number | null = null,
//     linkPrecedence: "primary" | "secondary" = "primary"
//   ): Promise<Contact> {
//     const query = `
//       INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
//       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
//       RETURNING *
//     `;
//     const result = await pool.query(query, [
//       email,
//       phoneNumber,
//       linkedId,
//       linkPrecedence,
//     ]);
//     return result.rows[0];
//   }

//   private moveValueToFront<T>(arr: T[], value: T | null): T[] {
//     if (value == null) return arr;
//     return [value, ...arr.filter((v) => v !== value)];
//   }

//   private async ensureNewSecondary(
//     email: string | null,
//     phoneNumber: string | null,
//     primaryId: number,
//     linkedContacts: Contact[]
//   ) {
//     const exists = linkedContacts.some(
//       (c) => c.email === email && c.phoneNumber === phoneNumber
//     );
//     if (!exists) {
//       const newSec = await this.createContact(
//         email,
//         phoneNumber,
//         primaryId,
//         "secondary"
//       );
//       linkedContacts.push(newSec);
//     }
//   }

//   async identify(request: IdentifyRequest): Promise<IdentifyResponse> {
//     const email = request.email?.trim() || null;
//     const phoneNumber = request.phoneNumber?.trim() || null;

//     // fetch matches
//     const existingContacts = await this.findContactsByEmailOrPhone(
//       email || undefined,
//       phoneNumber || undefined
//     );

//     const primaries = existingContacts.filter(
//       (c) => c.linkPrecedence === "primary"
//     );
//     if (primaries.length > 1) {
//       // sort by createdAt ascending so oldest wins
//       primaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
//       const winner = primaries[0];

//       // demote the others to secondary
//       for (const loser of primaries.slice(1)) {
//         await pool.query(
//           `UPDATE Contact 
//          SET linkPrecedence='secondary', linkedId=$1, updatedAt=CURRENT_TIMESTAMP 
//        WHERE id=$2`,
//           [winner.id, loser.id]
//         );
//         // also re-link any of their secondaries
//         await pool.query(
//           `UPDATE Contact 
//          SET linkedId=$1, updatedAt=CURRENT_TIMESTAMP 
//        WHERE linkedId=$2`,
//           [winner.id, loser.id]
//         );
//       }

//       // update in-memory
//       for (const c of existingContacts) {
//         if (c.id === winner.id) {
//           c.linkPrecedence = "primary";
//           c.linkedId = null;
//         } else {
//           c.linkPrecedence = "secondary";
//           c.linkedId = winner.id;
//         }
//       }
//     }

//     // if no matches, create new primary and return
//     if (!existingContacts.length) {
//       const created = await this.createContact(email, phoneNumber);
//       return {
//         contact: {
//           primaryContatctId: created.id,
//           emails: created.email ? [created.email] : [],
//           phoneNumbers: created.phoneNumber ? [created.phoneNumber] : [],
//           secondaryContactIds: [],
//         },
//       };
//     }

//     // if matches exist, ensure one primary
//     const anyPrimary = existingContacts.some(
//       (c) => c.linkPrecedence === "primary"
//     );
//     if (!anyPrimary) {
//       // promote oldest to primary
//       existingContacts.sort(
//         (a, b) =>
//           new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
//       );
//       const newPrimary = existingContacts[0];
//       await pool.query(
//         `UPDATE Contact SET linkPrecedence='primary', linkedId=NULL, updatedAt=CURRENT_TIMESTAMP WHERE id=$1`,
//         [newPrimary.id]
//       );
//       // rest to secondary
//       for (const sec of existingContacts.slice(1)) {
//         await pool.query(
//           `UPDATE Contact SET linkPrecedence='secondary', linkedId=$1, updatedAt=CURRENT_TIMESTAMP WHERE id=$2`,
//           [newPrimary.id, sec.id]
//         );
//       }
//       // update in-memory
//       for (const c of existingContacts) {
//         c.linkPrecedence = c.id === newPrimary.id ? "primary" : "secondary";
//         c.linkedId = c.id === newPrimary.id ? null : newPrimary.id;
//       }
//     }


//     // now there is exactly one primary
//     const primaryContact = existingContacts.find(
//       (c) => c.linkPrecedence === "primary"
//     )!;
//     const allLinked = await this.findAllLinkedContacts(primaryContact.id);

//     // add new secondary if needed
//     await this.ensureNewSecondary(
//       email,
//       phoneNumber,
//       primaryContact.id,
//       allLinked
//     );

//     // prepare response
//     const secondaryContactIds = allLinked
//       .filter((c) => c.linkPrecedence === "secondary")
//       .map((c) => c.id);
//     const emails = this.moveValueToFront(
//       Array.from(
//         new Set(allLinked.map((c) => c.email).filter((e): e is string => !!e))
//       ),
//       primaryContact.email
//     );
//     const phoneNumbers = this.moveValueToFront(
//       Array.from(
//         new Set(
//           allLinked.map((c) => c.phoneNumber).filter((p): p is string => !!p)
//         )
//       ),
//       primaryContact.phoneNumber
//     );

//     return {
//       contact: {
//         primaryContatctId: primaryContact.id,
//         emails,
//         phoneNumbers,
//         secondaryContactIds,
//       },
//     };
//   }
// }




import pool from "./database";
import { Contact, IdentifyRequest, IdentifyResponse } from "./types";

export class ContactService {
  private mapRowToContact(row: any): Contact {
    return {
      id: row.id,
      email: row.email,
      phoneNumber: row.phoneNumber,
      linkedId: row.linkedId,
      linkPrecedence: row.linkPrecedence,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }

  async findContactsByEmailOrPhone(email?: string, phoneNumber?: string): Promise<Contact[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (email) {
      conditions.push(`email = $${idx++}`);
      values.push(email);
    }
    if (phoneNumber) {
      conditions.push(`phonenumber = $${idx++}`);
      values.push(phoneNumber);
    }
    if (!conditions.length) return [];

    const query = `
      SELECT
        id,
        email,
        phonenumber AS "phoneNumber",
        linkedid   AS "linkedId",
        linkprecedence AS "linkPrecedence",
        createdat  AS "createdAt",
        updatedat  AS "updatedAt",
        deletedat  AS "deletedAt"
      FROM Contact
      WHERE (${conditions.join(' OR ')}) AND deletedat IS NULL
      ORDER BY createdat ASC
    `;
    const result = await pool.query(query, values);
    return result.rows.map(this.mapRowToContact);
  }

  async findAllLinkedContacts(primaryId: number): Promise<Contact[]> {
    const query = `
      SELECT
        id,
        email,
        phonenumber AS "phoneNumber",
        linkedid   AS "linkedId",
        linkprecedence AS "linkPrecedence",
        createdat  AS "createdAt",
        updatedat  AS "updatedAt",
        deletedat  AS "deletedAt"
      FROM Contact
      WHERE (id = $1 OR linkedid = $1) AND deletedat IS NULL
      ORDER BY createdat ASC
    `;
    const result = await pool.query(query, [primaryId]);
    return result.rows.map(this.mapRowToContact);
  }

  async createContact(
    email: string | null,
    phoneNumber: string | null,
    linkedId: number | null = null,
    linkPrecedence: 'primary' | 'secondary' = 'primary'
  ): Promise<Contact> {
    const query = `
      INSERT INTO Contact (email, phonenumber, linkedid, linkprecedence, createdat, updatedat)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING
        id,
        email,
        phonenumber   AS "phoneNumber",
        linkedid      AS "linkedId",
        linkprecedence AS "linkPrecedence",
        createdat     AS "createdAt",
        updatedat     AS "updatedAt",
        deletedat     AS "deletedAt"
    `;
    const result = await pool.query(query, [email, phoneNumber, linkedId, linkPrecedence]);
    return this.mapRowToContact(result.rows[0]);
  }

  private moveValueToFront<T>(arr: T[], value: T | null): T[] {
    if (value == null) return arr;
    return [value, ...arr.filter(v => v !== value)];
  }

  private async ensureNewSecondary(
    email: string | null,
    phoneNumber: string | null,
    primaryId: number,
    linkedContacts: Contact[]
  ) {
    const exists = linkedContacts.some(
      c => c.email === email && c.phoneNumber === phoneNumber
    );
    if (!exists) {
      const newSec = await this.createContact(
        email,
        phoneNumber,
        primaryId,
        'secondary'
      );
      linkedContacts.push(newSec);
    }
  }

  async identify(request: IdentifyRequest): Promise<IdentifyResponse> {
    const email = request.email?.trim() || null;
    const phoneNumber = request.phoneNumber?.trim() || null;

    // 1) fetch matches
    let existingContacts = await this.findContactsByEmailOrPhone(
      email || undefined,
      phoneNumber || undefined
    );

    // 2) merge multiple primaries
    const primaries = existingContacts.filter(c => c.linkPrecedence === 'primary');
    if (primaries.length > 1) {
      primaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const winner = primaries[0];
      for (const loser of primaries.slice(1)) {
        await pool.query(
          `UPDATE Contact SET linkprecedence='secondary', linkedid=$1, updatedat=CURRENT_TIMESTAMP WHERE id=$2`,
          [winner.id, loser.id]
        );
        await pool.query(
          `UPDATE Contact SET linkedid=$1, updatedat=CURRENT_TIMESTAMP WHERE linkedid=$2`,
          [winner.id, loser.id]
        );
      }
      existingContacts = existingContacts.map(c =>
        c.id === winner.id
          ? { ...c, linkPrecedence: 'primary', linkedId: null }
          : { ...c, linkPrecedence: 'secondary', linkedId: winner.id }
      );
    }

    // 3) no matches → new primary
    if (!existingContacts.length) {
      const created = await this.createContact(email, phoneNumber);
      return { contact: {
        primaryContatctId: created.id,
        emails: created.email ? [created.email] : [],
        phoneNumbers: created.phoneNumber ? [created.phoneNumber] : [],
        secondaryContactIds: []
      }};
    }

    // 4) orphan secondaries → promote one
    const hasPrimary = existingContacts.some(c => c.linkPrecedence === 'primary');
    if (!hasPrimary) {
      existingContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const newPrimary = existingContacts[0];
      await pool.query(
        `UPDATE Contact SET linkprecedence='primary', linkedid=NULL, updatedat=CURRENT_TIMESTAMP WHERE id=$1`,
        [newPrimary.id]
      );
      for (const sec of existingContacts.slice(1)) {
        await pool.query(
          `UPDATE Contact SET linkprecedence='secondary', linkedid=$1, updatedat=CURRENT_TIMESTAMP WHERE id=$2`,
          [newPrimary.id, sec.id]
        );
      }
      existingContacts = existingContacts.map(c =>
        c.id === newPrimary.id
          ? { ...c, linkPrecedence: 'primary', linkedId: null }
          : { ...c, linkPrecedence: 'secondary', linkedId: newPrimary.id }
      );
    }

    // 5) single primary enforced
    const primaryContact = existingContacts.find(c => c.linkPrecedence === 'primary')!;
    const allLinked = await this.findAllLinkedContacts(primaryContact.id);

    // 6) add new secondary
    await this.ensureNewSecondary(email, phoneNumber, primaryContact.id, allLinked);

    // 7) build response
    const secondaryContactIds = allLinked
      .filter(c => c.linkPrecedence === 'secondary')
      .map(c => c.id);
    const emailsArr = this.moveValueToFront(
      Array.from(new Set(allLinked.map(c => c.email).filter((e): e is string => !!e))),
      primaryContact.email
    );
    const phonesArr = this.moveValueToFront(
      Array.from(new Set(allLinked.map(c => c.phoneNumber).filter((p): p is string => !!p))),
      primaryContact.phoneNumber
    );

    return { contact: {
      primaryContatctId: primaryContact.id,
      emails: emailsArr,
      phoneNumbers: phonesArr,
      secondaryContactIds
    }};
  }
}
