using System.Security.Cryptography;
using System.Text;

namespace BreakingLanguageBarriers.Core.Security;

public static class SessionTokenHasher
{
    public static string GenerateToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    public static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash);
    }

    public static bool VerifyToken(string token, string storedHash)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(storedHash))
            return false;

        try
        {
            var computed = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            var expected = Convert.FromHexString(storedHash);
            return computed.Length == expected.Length
                && CryptographicOperations.FixedTimeEquals(computed, expected);
        }
        catch (CryptographicException)
        {
            return false;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
