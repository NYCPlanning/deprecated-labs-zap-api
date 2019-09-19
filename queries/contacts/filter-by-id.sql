SELECT *
FROM contact
INNER JOIN dcp_projectlupteam ON 
contact.contactid = dcp_projectlupteam.dcp_lupteammember
WHERE contactid = '${id:value}'
